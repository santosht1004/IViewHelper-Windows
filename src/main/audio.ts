import { AUDIO_MIME_TYPES, type AudioMimeType } from '../shared/ipc'

// MediaRecorder reports types like "audio/webm;codecs=opus"; APIs only need the base type.
export function normalizeAudioMimeType(value: unknown): AudioMimeType | null {
  if (typeof value !== 'string') return null
  const base = value.split(';')[0].trim().toLowerCase()
  return (AUDIO_MIME_TYPES as readonly string[]).includes(base) ? (base as AudioMimeType) : null
}

export function audioFileExtension(mimeType: AudioMimeType): string {
  return mimeType === 'audio/mp4' ? 'mp4' : 'webm'
}
