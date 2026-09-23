const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions'

// Uploads a recorded audio clip (local file uri) to OpenAI Whisper for transcription.
export async function transcribeAudio(fileUri: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key is required for speech-to-text.')

  const form = new FormData()
  form.append('file', {
    uri: fileUri,
    name: 'audio.m4a',
    type: 'audio/m4a'
  } as unknown as Blob)
  form.append('model', 'whisper-1')
  form.append('language', 'en')
  form.append('response_format', 'text')
  form.append('temperature', '0')

  const response = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Whisper API error (${response.status})`)
  }

  return (await response.text()).trim()
}
