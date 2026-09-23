import OpenAI, { toFile } from 'openai'
import type { AlibabaRegion, AudioMimeType, ChatRequest, Provider } from '../shared/ipc'
import { audioFileExtension } from './audio'
import { isAbortError, type StreamSink } from './stream'
import { filterHallucinations } from './transcript-filter'

// Providers served through the OpenAI-compatible Chat Completions API.
export type OpenAICompatibleProvider = Exclude<Provider, 'gemini'>

const PROVIDER_BASE_URLS: Record<Exclude<OpenAICompatibleProvider, 'alibaba'>, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1'
}

// Alibaba Cloud Model Studio (DashScope) compatible-mode endpoints. Keys only work in their own region.
const ALIBABA_BASE_URLS: Record<AlibabaRegion, string> = {
  singapore: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  us: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
  beijing: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
}

const PROVIDER_LABELS: Record<OpenAICompatibleProvider, string> = {
  openai: 'OpenAI',
  groq: 'Groq',
  alibaba: 'Alibaba Cloud Model Studio'
}

// One Qwen-Omni model handles chat, screenshots, and mic transcription.
export const ALIBABA_OMNI_MODEL = 'qwen3.5-omni-flash'

// Groq vision is only supported on specific models
const GROQ_VISION_MODELS = [
  'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview'
]

let client: OpenAI | null = null

function getClient(apiKey: string, provider: OpenAICompatibleProvider, alibabaRegion: AlibabaRegion): OpenAI {
  if (!apiKey) {
    throw new Error(`${PROVIDER_LABELS[provider]} API key is required. Please set it in Settings.`)
  }
  const baseURL = provider === 'alibaba' ? ALIBABA_BASE_URLS[alibabaRegion] : PROVIDER_BASE_URLS[provider]
  if (!client || client.apiKey !== apiKey || client.baseURL !== baseURL) {
    client = new OpenAI({ apiKey, baseURL })
  }
  return client
}

export async function streamChat(
  request: ChatRequest & { provider: OpenAICompatibleProvider },
  apiKey: string,
  alibabaRegion: AlibabaRegion,
  sink: StreamSink,
  signal: AbortSignal
): Promise<void> {
  const supportsVision =
    request.provider !== 'groq' || GROQ_VISION_MODELS.includes(request.model) || /vision/i.test(request.model)

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  // Add system prompt
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt })
  }

  // Add conversation messages, stripping images for non-vision models
  for (const msg of request.messages) {
    if (!supportsVision && Array.isArray(msg.content)) {
      const textParts = msg.content
        .map(p => (p.type === 'text' ? p.text : ''))
        .filter(Boolean)
        .join('\n')
      messages.push({ role: msg.role, content: textParts || '[screenshot attached — this model does not support images]' })
    } else {
      messages.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam)
    }
  }

  try {
    const openai = getClient(apiKey, request.provider, alibabaRegion)
    const isReasoningModel = request.provider === 'openai' && /^(o\d|gpt-5)/.test(request.model)
    const sendReasoning = isReasoningModel && request.reasoningEffort !== 'off'

    const stream = await openai.chat.completions.create(
      {
        model: request.model,
        messages,
        stream: true,
        // The API accepts 'minimal' for gpt-5 models even though this SDK version's type omits it.
        ...(sendReasoning && { reasoning_effort: request.reasoningEffort as OpenAI.ReasoningEffort }),
        // Qwen-Omni can also speak; ask for text only.
        ...(request.provider === 'alibaba' && { modalities: ['text'] as OpenAI.Chat.ChatCompletionModality[] })
      },
      { signal }
    )

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) sink.chunk(delta)
    }

    sink.done()
  } catch (error: unknown) {
    if (signal.aborted || isAbortError(error)) return
    sink.error(error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  mimeType: AudioMimeType,
  apiKey: string,
  provider: Exclude<OpenAICompatibleProvider, 'alibaba'>
): Promise<string> {
  const openai = getClient(apiKey, provider, 'singapore')

  const buffer = Buffer.from(audioBuffer)
  const file = await toFile(buffer, `audio.${audioFileExtension(mimeType)}`, { type: mimeType })

  const response = await openai.audio.transcriptions.create({
    model: provider === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1',
    file,
    language: 'en',
    response_format: 'text',
    temperature: 0
  })

  return filterHallucinations(response as unknown as string)
}

// Qwen-Omni has no transcription endpoint, so the recording (sent as-is, not converted) goes
// to the same omni model through Chat Completions. Omni models only support streaming output.
export async function transcribeAlibabaAudio(
  audioBuffer: ArrayBuffer,
  mimeType: AudioMimeType,
  apiKey: string,
  alibabaRegion: AlibabaRegion
): Promise<string> {
  const openai = getClient(apiKey, 'alibaba', alibabaRegion)
  const base64Audio = Buffer.from(audioBuffer).toString('base64')

  const audioPart = {
    type: 'input_audio',
    input_audio: {
      data: `data:${mimeType};base64,${base64Audio}`,
      format: audioFileExtension(mimeType)
    }
  } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPartInputAudio

  const stream = await openai.chat.completions.create({
    model: ALIBABA_OMNI_MODEL,
    stream: true,
    modalities: ['text'],
    messages: [
      {
        role: 'user',
        content: [
          audioPart,
          {
            type: 'text',
            text: 'Transcribe the spoken words in this audio verbatim. Output ONLY the raw transcription text, nothing else. Do not add explanations, formatting, or labels. If there is no speech, output nothing.'
          }
        ]
      }
    ]
  })

  let text = ''
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content ?? ''
  }

  return filterHallucinations(text.trim())
}
