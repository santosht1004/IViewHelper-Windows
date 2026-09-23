import { fetch } from 'expo/fetch'
import type { ChatRequest } from '../lib/types'

const BASE_URL = 'https://api.openai.com/v1'

export async function* streamOpenAIChat(
  request: ChatRequest,
  apiKey: string,
  signal: AbortSignal
): AsyncGenerator<string> {
  if (!apiKey) throw new Error('OpenAI API key is required. Please set it in Settings.')

  const messages: Record<string, unknown>[] = []
  if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt })
  for (const msg of request.messages) messages.push(msg)

  const isReasoningModel = /^(o\d|gpt-5)/.test(request.model)
  const sendReasoning = isReasoningModel && request.reasoningEffort !== 'off'

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: request.model,
      messages,
      stream: true,
      ...(sendReasoning && { reasoning_effort: request.reasoningEffort })
    }),
    signal
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseErrorMessage(text) || `OpenAI API error (${response.status})`)
  }
  if (!response.body) throw new Error('No response body received from OpenAI API')

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
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) yield delta as string
      } catch {
        // ignore malformed SSE chunk
      }
    }
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
