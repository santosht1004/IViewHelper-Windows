// Whisper hallucinates common YouTube/video outro phrases on silence or noise.
// Drop them post-transcription as a safety net behind the client-side VAD.
const HALLUCINATIONS = new Set([
  'thank you',
  'thank you bye bye',
  'thank you bye',
  'bye bye',
  'thanks for watching',
  'thank you for watching',
  'thank you so much for watching',
  'thank you so much for watching and ill see you in the next video',
  'thanks for watching see you in the next video',
  'ill see you in the next video',
  'see you in the next video',
  'dont forget to subscribe',
  'like and subscribe',
  'please subscribe',
  'subtitles by the amaraorg community',
  'subtitles by',
  'subtitles',
  'music',
  'applause',
  'silence',
  'mm',
  'mmm',
  'hmm',
  'uh',
  'um'
])

export function filterHallucinations(text: string): string {
  if (!text) return ''
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return ''
  if (HALLUCINATIONS.has(normalized)) return ''
  return text
}
