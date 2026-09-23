import { fetch } from 'expo/fetch'
import type { ChatMessagePayload, ChatRequest } from '../lib/types'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}
interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
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
    if (parts.length > 0) contents.push({ role, parts })
  }
  return contents
}

function validateGeminiKey(apiKey: string): string {
  const trimmed = (apiKey || '').trim()
  if (!trimmed) throw new Error('Gemini API key is required. Please set your Google AI Studio API key in Settings.')
  return trimmed
}

const REASONING_BUDGET: Record<string, number> = { minimal: 1024, low: 2048, medium: 4096, high: 8192 }

export async function* streamGeminiChat(
  request: ChatRequest,
  apiKey: string,
  signal: AbortSignal
): AsyncGenerator<string> {
  const key = validateGeminiKey(apiKey)
  const body: Record<string, unknown> = { contents: toGeminiContents(request.messages) }

  if (request.systemPrompt?.trim()) {
    body.system_instruction = { parts: [{ text: request.systemPrompt }] }
  }

  const isReasoningModel = /^(gemini-3|gemini-2\.5|gemini-2\.0-flash-thinking)/.test(request.model)
  if (isReasoningModel && request.reasoningEffort !== 'off') {
    body.generationConfig = { thinkingConfig: { thinkingBudget: REASONING_BUDGET[request.reasoningEffort] || 2048 } }
  }

  const modelName = request.model || 'gemini-flash-latest'
  const url = `${API_BASE}/${encodeURIComponent(modelName)}:streamGenerateContent?alt=sse`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
    body: JSON.stringify(body),
    signal
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseErrorMessage(text) ?? `Gemini API error (${response.status})`)
  }
  if (!response.body) throw new Error('No response body received from Gemini API')

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
      if (text) yield text
    }
  }
}

function parseSseLine(line: string): string {
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

function parseErrorMessage(text: string): string | null {
  try {
    const json = JSON.parse(text)
    return json.error?.message ?? null
  } catch {
    return text || null
  }
}
