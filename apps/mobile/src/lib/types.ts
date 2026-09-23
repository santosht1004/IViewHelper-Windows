export const PROVIDERS = ['openai', 'gemini'] as const
export type Provider = (typeof PROVIDERS)[number]

export const REASONING_EFFORTS = ['off', 'minimal', 'low', 'medium', 'high'] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessagePayload {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images: string[] // base64 data URLs
  timestamp: number
}

export interface ChatRequest {
  messages: ChatMessagePayload[]
  model: string
  systemPrompt: string
  provider: Provider
  reasoningEffort: ReasoningEffort
}

export function modelSupportsReasoning(model: string): boolean {
  return /^(o\d|gpt-5|gemini-3|gemini-2\.5|gemini-2\.0-flash-thinking)/.test(model)
}

export const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-5.4',
  gemini: 'gemini-flash-latest'
}
