import type { ContentPart, ChatMessagePayload, ReasoningEffort } from '@interviewhelper/shared'
export { REASONING_EFFORTS, modelSupportsReasoning } from '@interviewhelper/shared'
export type { ContentPart, ChatMessagePayload, ReasoningEffort }

// Mobile only supports the providers with a fetch-based streaming client (see src/api).
export const PROVIDERS = ['openai', 'gemini'] as const
export type Provider = (typeof PROVIDERS)[number]

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

export const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-5.4',
  gemini: 'gemini-flash-latest'
}
