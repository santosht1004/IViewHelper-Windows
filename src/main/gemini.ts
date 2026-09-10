import { BrowserWindow } from 'electron'
import { filterHallucinations } from './openai'

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

export async function streamGeminiChat(
  mainWindow: BrowserWindow,
  payload: {
    messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    model: string;
    systemPrompt: string;
    apiKey: string;
    provider: string;
    reasoningEffort: 'off' | 'minimal' | 'low' | 'medium' | 'high';
  }
): Promise<void> {
  try {
    const key = validateGeminiKey(payload.apiKey)
    const contents: GeminiContent[] = []

    for (const msg of payload.messages) {
      const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user'
      const parts: GeminiPart[] = []

      if (typeof msg.content === 'string') {
        if (msg.content) {
          parts.push({ text: msg.content })
        }
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'text' && item.text) {
            parts.push({ text: item.text })
          } else if (item.type === 'image_url' && item.image_url?.url) {
            const match = item.image_url.url.match(/^data:([^;]+);base64,(.+)$/)
            if (match) {
              parts.push({
                inline_data: {
                  mime_type: match[1],
                  data: match[2]
                }
              })
            } else {
              parts.push({
                inline_data: {
                  mime_type: 'image/png',
                  data: item.image_url.url
                }
              })
            }
          }
        }
      }

      if (parts.length === 0) {
        parts.push({ text: '' })
      }

      contents.push({ role, parts })
    }

    const body: Record<string, unknown> = {
      contents
    }

    if (payload.systemPrompt && payload.systemPrompt.trim()) {
      body.system_instruction = {
        parts: [{ text: payload.systemPrompt }]
      }
    }

    const isReasoningModel = /^(gemini-3|gemini-2\.5|gemini-2\.0-flash-thinking)/.test(payload.model)
    if (isReasoningModel && payload.reasoningEffort !== 'off') {
      const budgetMap: Record<string, number> = {
        minimal: 1024,
        low: 2048,
        medium: 4096,
        high: 8192
      }
      body.generationConfig = {
        thinkingConfig: {
          thinkingBudget: budgetMap[payload.reasoningEffort] || 2048
        }
      }
    }

    const modelName = payload.model || 'gemini-flash-latest'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': key
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMsg = `Gemini API error (${response.status})`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message
        }
      } catch {
        if (errorText) errorMsg = errorText
      }
      throw new Error(errorMsg)
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
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const dataStr = trimmed.slice(5).trim()
        if (!dataStr || dataStr === '[DONE]') continue

        try {
          const data = JSON.parse(dataStr)
          if (data.candidates && data.candidates[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
              if (part.text) {
                mainWindow.webContents.send('openai-stream-chunk', part.text)
              }
            }
          }
        } catch {
          // Incomplete chunk parse error, ignore
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      try {
        const data = JSON.parse(buffer.trim().slice(5).trim())
        if (data.candidates && data.candidates[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.text) {
              mainWindow.webContents.send('openai-stream-chunk', part.text)
            }
          }
        }
      } catch {}
    }

    mainWindow.webContents.send('openai-stream-done')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    mainWindow.webContents.send('openai-stream-error', message)
  }
}

export async function transcribeGeminiAudio(
  audioBuffer: ArrayBuffer,
  apiKey: string,
  model: string = 'gemini-flash-latest'
): Promise<string> {
  const key = validateGeminiKey(apiKey)
  const base64Audio = Buffer.from(audioBuffer).toString('base64')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'audio/webm',
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
    const errorText = await response.text()
    let errorMsg = `Gemini audio transcription error (${response.status})`
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error?.message) {
        errorMsg = errorJson.error.message
      }
    } catch {
      if (errorText) errorMsg = errorText
    }
    throw new Error(errorMsg)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return filterHallucinations(text)
}
