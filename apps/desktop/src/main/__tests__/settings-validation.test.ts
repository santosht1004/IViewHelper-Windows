import { describe, expect, it } from 'vitest'
import { sanitizeSettingsUpdate } from '../settings-validation'

describe('sanitizeSettingsUpdate', () => {
  it('keeps valid allow-listed settings', () => {
    const update = {
      provider: 'alibaba',
      alibabaRegion: 'us',
      model: 'gemini-2.5-pro',
      opacity: 0.5,
      fontSize: 16,
      reasoningEffort: 'high',
      activeSystemPromptId: null
    }
    expect(sanitizeSettingsUpdate(update)).toEqual(update)
  })

  it('drops keys that are not renderer-writable', () => {
    expect(
      sanitizeSettingsUpdate({
        apiKey: 'sk-x',
        secureApiKeys: {},
        systemPrompts: [],
        authState: { failures: 0, lockedUntil: 0 },
        __proto__: { polluted: true }
      })
    ).toEqual({})
  })

  it('drops values with the wrong type or range', () => {
    expect(
      sanitizeSettingsUpdate({
        provider: 'anthropic',
        alibabaRegion: 'mars',
        model: '',
        opacity: Number.NaN,
        fontSize: 13,
        reasoningEffort: 'extreme',
        activeSystemPromptId: 42
      })
    ).toEqual({})
    expect(sanitizeSettingsUpdate({ opacity: 0.05 })).toEqual({})
  })

  it('ignores non-object input', () => {
    expect(sanitizeSettingsUpdate(null)).toEqual({})
    expect(sanitizeSettingsUpdate('provider')).toEqual({})
    expect(sanitizeSettingsUpdate([['provider', 'groq']])).toEqual({})
  })
})
