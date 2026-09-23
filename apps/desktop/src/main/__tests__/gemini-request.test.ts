import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamGeminiChat, transcribeGeminiAudio } from '../gemini'
import type { ChatRequest } from '../../shared/ipc'
import type { StreamSink } from '../stream'

function sseResponse(lines: string[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder()
      for (const l of lines) controller.enqueue(enc.encode(l + '\n'))
      controller.close()
    }
  })
  return new Response(body, { status: 200 })
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

const req: ChatRequest = {
  requestId: 'g1',
  messages: [{ role: 'user', content: 'hi' }],
  model: 'gemini-2.5-pro',
  systemPrompt: 'sys',
  provider: 'gemini',
  reasoningEffort: 'off'
}

afterEach(() => vi.restoreAllMocks())

describe('streamGeminiChat', () => {
  it('puts the key in the header (never the URL) and streams text', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hel' }] } }] }),
        'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'lo' }] } }] })
      ])
    )
    const { sink, events } = collectingSink()
    await streamGeminiChat({ ...req }, 'AIzaSyKEY', sink, new AbortController().signal)

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).not.toContain('AIzaSyKEY')
    expect((init!.headers as Record<string, string>)['X-goog-api-key']).toBe('AIzaSyKEY')
    const body = JSON.parse(init!.body as string)
    expect(body.system_instruction.parts[0].text).toBe('sys')
    expect(events).toEqual(['done'])
  })

  it('rejects an OpenAI/Groq key mistakenly entered for Gemini', async () => {
    const { sink, events } = collectingSink()
    await streamGeminiChat({ ...req }, 'sk-openai', sink, new AbortController().signal)
    expect(events[0]).toMatch(/appears to be an OpenAI or Groq key/)
  })

  it('surfaces API errors from the response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'quota exceeded' } }), { status: 429 })
    )
    const { sink, events } = collectingSink()
    await streamGeminiChat({ ...req }, 'AIzaSyKEY', sink, new AbortController().signal)
    expect(events).toEqual(['error:quota exceeded'])
  })
})

describe('transcribeGeminiAudio', () => {
  it('sends the recording MIME type and returns the transcript', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hello world' }] } }] }), { status: 200 })
    )
    const result = await transcribeGeminiAudio(new Uint8Array([1, 2]).buffer, 'audio/webm', 'AIzaSyKEY')
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string)
    expect(body.contents[0].parts[0].inline_data.mime_type).toBe('audio/webm')
    expect(result).toBe('hello world')
  })
})
