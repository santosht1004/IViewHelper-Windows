import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatRequest } from '../../shared/ipc'
import type { OpenAICompatibleProvider } from '../openai'
import type { StreamSink } from '../stream'

// Capture the exact args each provider's client is created and called with.
const create = vi.fn()
const ctorCalls: Array<{ apiKey: string; baseURL: string }> = []

vi.mock('openai', () => {
  class MockOpenAI {
    apiKey: string
    baseURL: string
    chat = { completions: { create } }
    constructor(opts: { apiKey: string; baseURL: string }) {
      this.apiKey = opts.apiKey
      this.baseURL = opts.baseURL
      ctorCalls.push(opts)
    }
  }
  return { default: MockOpenAI, toFile: vi.fn() }
})

// Async iterable of streamed content deltas.
function fakeStream(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield { choices: [{ delta: { content: c } }] }
    }
  }
}

function collectingSink() {
  let text = ''
  const events: string[] = []
  const sink: StreamSink = {
    chunk: t => { text += t },
    done: () => events.push('done'),
    error: e => events.push('error:' + e)
  }
  return { sink, get text() { return text }, events }
}

const baseRequest: ChatRequest & { provider: OpenAICompatibleProvider } = {
  requestId: 'r1',
  messages: [{ role: 'user', content: 'hello' }],
  model: 'gpt-5.4',
  systemPrompt: 'be nice',
  provider: 'openai',
  reasoningEffort: 'off'
}

let streamChat: typeof import('../openai').streamChat
let transcribeAlibabaAudio: typeof import('../openai').transcribeAlibabaAudio

beforeEach(async () => {
  create.mockReset()
  ctorCalls.length = 0
  vi.resetModules()
  ;({ streamChat, transcribeAlibabaAudio } = await import('../openai'))
})

afterEach(() => vi.clearAllMocks())

describe('streamChat request shape', () => {
  it('sends system prompt, streams deltas, and finishes', async () => {
    create.mockResolvedValue(fakeStream(['Hi', ' there']))
    const { sink, events } = collectingSink()
    await streamChat({ ...baseRequest }, 'sk-key', 'singapore', sink, new AbortController().signal)

    const [body] = create.mock.calls[0]
    expect(body.stream).toBe(true)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'be nice' })
    expect(body.reasoning_effort).toBeUndefined()
    expect(events).toEqual(['done'])
    expect(ctorCalls[0].baseURL).toBe('https://api.openai.com/v1')
  })

  it('includes reasoning_effort only for reasoning models when enabled', async () => {
    create.mockResolvedValue(fakeStream([]))
    const { sink } = collectingSink()
    await streamChat(
      { ...baseRequest, model: 'gpt-5.4', reasoningEffort: 'high' },
      'sk-key', 'singapore', sink, new AbortController().signal
    )
    expect(create.mock.calls[0][0].reasoning_effort).toBe('high')
  })

  it('strips images for non-vision Groq models', async () => {
    create.mockResolvedValue(fakeStream([]))
    const { sink } = collectingSink()
    await streamChat(
      {
        ...baseRequest,
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: [
          { type: 'text', text: 'what is this' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }
        ] }]
      },
      'gsk-key', 'singapore', sink, new AbortController().signal
    )
    const userMsg = create.mock.calls[0][0].messages.at(-1)
    expect(userMsg.content).toBe('what is this')
    expect(ctorCalls[0].baseURL).toBe('https://api.groq.com/openai/v1')
  })

  it('keeps images for vision-capable Groq models', async () => {
    create.mockResolvedValue(fakeStream([]))
    const { sink } = collectingSink()
    await streamChat(
      {
        ...baseRequest, provider: 'groq', model: 'llama-3.2-90b-vision-preview',
        messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }] }]
      },
      'gsk-key', 'singapore', sink, new AbortController().signal
    )
    expect(Array.isArray(create.mock.calls[0][0].messages.at(-1).content)).toBe(true)
  })

  it('routes Alibaba to the region base URL and requests text modality only', async () => {
    create.mockResolvedValue(fakeStream(['ok']))
    const { sink } = collectingSink()
    await streamChat(
      { ...baseRequest, provider: 'alibaba', model: 'qwen3.5-omni-flash' },
      'ali-key', 'us', sink, new AbortController().signal
    )
    expect(ctorCalls[0].baseURL).toBe('https://dashscope-us.aliyuncs.com/compatible-mode/v1')
    expect(create.mock.calls[0][0].modalities).toEqual(['text'])
  })

  it('reports errors through the sink', async () => {
    create.mockRejectedValue(new Error('boom'))
    const { sink, events } = collectingSink()
    await streamChat({ ...baseRequest }, 'sk-key', 'singapore', sink, new AbortController().signal)
    expect(events).toEqual(['error:boom'])
  })

  it('swallows abort errors without emitting an error event', async () => {
    const controller = new AbortController()
    controller.abort()
    create.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'APIUserAbortError' }))
    const { sink, events } = collectingSink()
    await streamChat({ ...baseRequest }, 'sk-key', 'singapore', sink, controller.signal)
    expect(events).toEqual([])
  })

  it('throws a helpful error when the API key is missing', async () => {
    const { sink, events } = collectingSink()
    await streamChat({ ...baseRequest, provider: 'alibaba' }, '', 'singapore', sink, new AbortController().signal)
    expect(events[0]).toMatch(/Alibaba Cloud Model Studio API key is required/)
  })
})

describe('transcribeAlibabaAudio', () => {
  it('sends the recording as an input_audio data URL and returns joined text', async () => {
    create.mockResolvedValue(fakeStream(['spoken ', 'words']))
    const buffer = new Uint8Array([1, 2, 3]).buffer
    const result = await transcribeAlibabaAudio(buffer, 'audio/webm', 'ali-key', 'singapore')

    const body = create.mock.calls[0][0]
    expect(body.model).toBe('qwen3.5-omni-flash')
    expect(body.stream).toBe(true)
    const audioPart = body.messages[0].content[0]
    expect(audioPart.type).toBe('input_audio')
    expect(audioPart.input_audio.format).toBe('webm')
    expect(audioPart.input_audio.data).toMatch(/^data:audio\/webm;base64,/)
    expect(result).toBe('spoken words')
    expect(ctorCalls[0].baseURL).toBe('https://dashscope-intl.aliyuncs.com/compatible-mode/v1')
  })
})
