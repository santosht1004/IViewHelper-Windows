// Types shared across the desktop (Electron) and mobile (Expo) apps.
// Keep this file free of runtime/platform-specific imports so every build target can include it.

export const PROVIDERS = ['openai', 'groq', 'gemini', 'alibaba'] as const
export type Provider = (typeof PROVIDERS)[number]

// Alibaba Cloud Model Studio API keys are bound to the region they were created in.
export const ALIBABA_REGIONS = ['singapore', 'us', 'beijing'] as const
export type AlibabaRegion = (typeof ALIBABA_REGIONS)[number]

// MediaRecorder output formats the transcription handlers accept (sent as-is, never converted).
export const AUDIO_MIME_TYPES = ['audio/webm', 'audio/mp4'] as const
export type AudioMimeType = (typeof AUDIO_MIME_TYPES)[number]

export const REASONING_EFFORTS = ['off', 'minimal', 'low', 'medium', 'high'] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

export type STTProvider = 'whisper'

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessagePayload {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ChatRequest {
  requestId: string
  messages: ChatMessagePayload[]
  model: string
  systemPrompt: string
  provider: Provider
  reasoningEffort: ReasoningEffort
}

export interface SystemPrompt {
  id: string
  name: string
  content: string
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export interface Settings {
  provider: Provider
  alibabaRegion: AlibabaRegion
  model: string
  opacity: number
  fontSize: number
  sttProvider: STTProvider
  reasoningEffort: ReasoningEffort
  activeSystemPromptId: string | null
  // API keys never leave the main process; the renderer only learns whether one is set.
  hasApiKey: Record<Provider, boolean>
  keyStorageEncrypted: boolean
}

export type SettingsUpdate = Partial<
  Pick<Settings, 'provider' | 'alibabaRegion' | 'model' | 'opacity' | 'fontSize' | 'reasoningEffort' | 'activeSystemPromptId'>
>

export interface AuthStatus {
  unlocked: boolean
  remaining: number
  lockedForMs: number
}

export interface UnlockResult {
  ok: boolean
  remaining: number
  lockedForMs: number
}

export function modelSupportsReasoning(model: string): boolean {
  return /^(o\d|gpt-5|gemini-3|gemini-2\.5|gemini-2\.0-flash-thinking)/.test(model)
}

export const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-5.4',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-flash-latest',
  alibaba: 'qwen3.5-omni-flash'
}
