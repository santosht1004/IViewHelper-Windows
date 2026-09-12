import type { AudioMimeType, ChatMessagePayload, ChatRequest } from '../shared/ipc'
import { isAbortError, type StreamSink } from './stream'
import { filterHallucinations } from './transcript-filter'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

function validateGeminiKey(apiKey: string): string {
  const trimmed = (apiKey || '').trim()
  if (!trimmed) {
    throw new Error('Gemini API key is required. Please set your Google AI Studio API key in Settings.')
  }
  if (trimmed.startsWith('sk-') || trimmed.startsWith('gsk_')) {
    throw new Error('Invalid Gemini API key: The configured key appears to be an OpenAI or Groq key (starts with sk- / gsk_). Please open Settings and enter your Google AI Studio Gemini API key (starts with AIzaSy...).')
  }
  return trimmed
}

export function toGeminiContents(messages: ChatMessagePayload[]): GeminiContent[] {
  const contents: GeminiContent[] = []

  for (const msg of messages) {
    const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user'
    const parts: GeminiPart[] = []

    if (typeof msg.content === 'string') {
      if (msg.content) parts.push({ text: msg.content })
    } else {
      for (const item of msg.content) {
        if (item.type === 'text' && item.text) {
          parts.push({ text: item.text })
        } else if (item.type === 'image_url' && item.image_url.url) {
          const match = item.image_url.url.match(/^data:([^;]+);base64,(.+)$/)
          parts.push({
            inline_data: match
              ? { mime_type: match[1], data: match[2] }
              : { mime_type: 'image/png', data: item.image_url.url }
          })
        }
      }
    }

    // Gemini rejects empty parts, so drop messages with nothing to send (e.g. an empty reply).
    if (parts.length > 0) contents.push({ role, parts })
  }

  return contents
}

// Extracts the text from one SSE line of a streamGenerateContent response.
export function parseSseLine(line: string): string {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return ''
  const dataStr = trimmed.slice(5).trim()
  if (!dataStr || dataStr === '[DONE]') return ''

  try {
    const data = JSON.parse(dataStr)
    const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts ?? []
    return parts.map(p => p.text ?? '').join('')
  } catch {
    return ''
  }
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const errorText = await response.text()
  try {
    const errorJson = JSON.parse(errorText)
    if (errorJson.error?.message) return new Error(errorJson.error.message)
  } catch {
    if (errorText) return new Error(errorText)
  }
  return new Error(fallback)
}

export async function streamGeminiChat(
  request: ChatRequest,
  apiKey: string,
  sink: StreamSink,
  signal: AbortSignal
): Promise<void> {
  try {
    const key = validateGeminiKey(apiKey)
    const body: Record<string, unknown> = {
      contents: toGeminiContents(request.messages)
    }

    if (request.systemPrompt && request.systemPrompt.trim()) {
      body.system_instruction = {
        parts: [{ text: request.systemPrompt }]
      }
    }

    const isReasoningModel = /^(gemini-3|gemini-2\.5|gemini-2\.0-flash-thinking)/.test(request.model)
    if (isReasoningModel && request.reasoningEffort !== 'off') {
      const budgetMap: Record<string, number> = {
        minimal: 1024,
        low: 2048,
        medium: 4096,
        high: 8192
      }
      body.generationConfig = {
        thinkingConfig: {
          thinkingBudget: budgetMap[request.reasoningEffort] || 2048
        }
      }
    }

    const modelName = request.model || 'gemini-flash-latest'
    // The key goes in the header only, never the URL, so it can't leak into request logs.
    const url = `${API_BASE}/${encodeURIComponent(modelName)}:streamGenerateContent?alt=sse`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': key
      },
      body: JSON.stringify(body),
      signal
    })

    if (!response.ok) {
      throw await readError(response, `Gemini API error (${response.status})`)
    }

    if (!response.body) {
      throw new Error('No response body received from Gemini API')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const text = parseSseLine(line)
        if (text) sink.chunk(text)
      }
    }

    const tail = parseSseLine(buffer)
    if (tail) sink.chunk(tail)

    sink.done()
  } catch (error: unknown) {
    if (signal.aborted || isAbortError(error)) return
    sink.error(error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function transcribeGeminiAudio(
  audioBuffer: ArrayBuffer,
  mimeType: AudioMimeType,
  apiKey: string,
  model: string = 'gemini-flash-latest'
): Promise<string> {
  const key = validateGeminiKey(apiKey)
  const base64Audio = Buffer.from(audioBuffer).toString('base64')
  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent`

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Audio
            }
          },
          {
            text: 'Transcribe the spoken words in this audio verbatim. Output ONLY the raw transcription text, nothing else. Do not add explanations, formatting, or labels.'
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': key
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw await readError(response, `Gemini audio transcription error (${response.status})`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return filterHallucinations(text)
}
