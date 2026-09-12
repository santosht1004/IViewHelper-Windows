export type { AlibabaRegion, Provider, ReasoningEffort, STTProvider, SystemPrompt } from '../../../shared/ipc'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  screenshots: string[] // base64 data URLs
  timestamp: number
}

export function modelSupportsReasoning(model: string): boolean {
  return /^(o\d|gpt-5|gemini-3|gemini-2\.5|gemini-2\.0-flash-thinking)/.test(model)
}
