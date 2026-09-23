import { ALIBABA_REGIONS, PROVIDERS, REASONING_EFFORTS, type Provider, type SettingsUpdate } from '../shared/ipc'

const FONT_SIZES = [12, 14, 16, 18]

export function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value)
}

// Only these keys may be written from the renderer, each with its own type check.
// Anything else (API keys, system prompts, auth state) has a dedicated handler.
const validators: { [K in keyof Required<SettingsUpdate>]: (v: unknown) => v is SettingsUpdate[K] } = {
  provider: isProvider,
  alibabaRegion: (v): v is SettingsUpdate['alibabaRegion'] =>
    typeof v === 'string' && (ALIBABA_REGIONS as readonly string[]).includes(v),
  model: (v): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200,
  opacity: (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0.1 && v <= 1,
  fontSize: (v): v is number => typeof v === 'number' && FONT_SIZES.includes(v),
  reasoningEffort: (v): v is SettingsUpdate['reasoningEffort'] =>
    typeof v === 'string' && (REASONING_EFFORTS as readonly string[]).includes(v),
  activeSystemPromptId: (v): v is string | null => v === null || (typeof v === 'string' && v.length <= 200)
}

export function sanitizeSettingsUpdate(input: unknown): SettingsUpdate {
  const result: Record<string, unknown> = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result

  for (const [key, value] of Object.entries(input)) {
    const validate = validators[key as keyof SettingsUpdate]
    if (validate && validate(value)) result[key] = value
  }
  return result as SettingsUpdate
}
