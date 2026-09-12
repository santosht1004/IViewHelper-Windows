import { describe, expect, it } from 'vitest'
import { audioFileExtension, normalizeAudioMimeType } from '../audio'

describe('normalizeAudioMimeType', () => {
  it('strips codec parameters from recorder MIME types', () => {
    expect(normalizeAudioMimeType('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(normalizeAudioMimeType('Audio/MP4')).toBe('audio/mp4')
  })

  it('rejects unsupported or non-string types', () => {
    expect(normalizeAudioMimeType('audio/wav')).toBeNull()
    expect(normalizeAudioMimeType('text/html')).toBeNull()
    expect(normalizeAudioMimeType(undefined)).toBeNull()
  })
})

describe('audioFileExtension', () => {
  it('maps MIME types to file extensions', () => {
    expect(audioFileExtension('audio/webm')).toBe('webm')
    expect(audioFileExtension('audio/mp4')).toBe('mp4')
  })
})
