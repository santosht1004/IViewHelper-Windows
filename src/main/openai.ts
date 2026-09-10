import { BrowserWindow } from 'electron'
import OpenAI, { toFile } from 'openai'

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1'
}

let client: OpenAI | null = null
let currentProvider: string | null = null

function getClient(apiKey: string, provider: string = 'openai'): OpenAI {
  if (!client || client.apiKey !== apiKey || currentProvider !== provider) {
    client = new OpenAI({
      apiKey,
      baseURL: PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.openai
    })
    currentProvider = provider
  }
  return client
}

export async function streamChat(
  mainWindow: BrowserWindow,
  payload: {
    messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    model: string;
    systemPrompt: string;
    apiKey: string;
    provider: string;
    reasoningEffort: 'off' | 'minimal' | 'low' | 'medium' | 'high';
  }
): Promise<void> {
  const openai = getClient(payload.apiKey, payload.provider)

  // Groq vision is only supported on specific models
  const GROQ_VISION_MODELS = [
    'llama-3.2-11b-vision-preview',
    'llama-3.2-90b-vision-preview'
  ]
  const supportsVision = payload.provider !== 'groq' || GROQ_VISION_MODELS.includes(payload.model) || /vision/i.test(payload.model)

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  // Add system prompt
  if (payload.systemPrompt) {
    messages.push({ role: 'system', content: payload.systemPrompt })
  }

  // Add conversation messages, stripping images for non-vision models
  for (const msg of payload.messages) {
    if (!supportsVision && Array.isArray(msg.content)) {
      const textParts = msg.content
        .filter((p: { type: string }) => p.type === 'text')
        .map((p: { text?: string }) => p.text || '')
        .join('\n')
      messages.push({ role: msg.role, content: textParts || '[screenshot attached — this model does not support images]' } as OpenAI.Chat.Completions.ChatCompletionMessageParam)
    } else {
      messages.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam)
    }
  }

  try {
    const isReasoningModel = payload.provider === 'openai' && /^(o\d|gpt-5)/.test(payload.model)
    const sendReasoning = isReasoningModel && payload.reasoningEffort !== 'off'

    const stream = await openai.chat.completions.create({
      model: payload.model,
      messages,
      stream: true,
      ...(sendReasoning && { reasoning_effort: payload.reasoningEffort })
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        mainWindow.webContents.send('openai-stream-chunk', delta)
      }
    }

    mainWindow.webContents.send('openai-stream-done')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    mainWindow.webContents.send('openai-stream-error', message)
  }
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  apiKey: string,
  provider: string = 'openai'
): Promise<string> {
  const openai = getClient(apiKey, provider)

  const buffer = Buffer.from(audioBuffer)
  const file = await toFile(buffer, 'audio.webm', { type: 'audio/webm' })

  const response = await openai.audio.transcriptions.create({
    model: provider === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1',
    file,
    language: 'en',
    response_format: 'text',
    temperature: 0
  })

  return filterHallucinations(response as unknown as string)
}

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
