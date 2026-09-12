import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { streamChat, transcribeAlibabaAudio } from '../openai'
import type { ChatRequest } from '../../shared/ipc'
import type { StreamSink } from '../stream'

// Opt-in live test: runs only when IVIEW_LIVE_KEY is set. Exercises the real
// main-process code paths against Alibaba Model Studio (Singapore region).
const KEY = process.env.IVIEW_LIVE_KEY
const WEBM = process.env.IVIEW_LIVE_WEBM
const IMG = process.env.IVIEW_LIVE_IMG
const run = KEY ? describe : describe.skip

function collect() {
  let text = ''
  const events: string[] = []
  const sink: StreamSink = { chunk: t => (text += t), done: () => events.push('done'), error: e => events.push('error:' + e) }
  return { sink, get text() { return text }, events }
}

const base: Omit<ChatRequest, 'messages'> & { provider: 'alibaba' } = {
  requestId: 'live', model: 'qwen3.5-omni-flash', systemPrompt: '', provider: 'alibaba', reasoningEffort: 'off'
}

run('Alibaba live (real code paths)', () => {
  it('streams a text chat reply', async () => {
    const c = collect()
    await streamChat(
      { ...base, messages: [{ role: 'user', content: 'Reply with exactly: PING' }] },
      KEY!, 'singapore', c.sink, new AbortController().signal
    )
    expect(c.events).toEqual(['done'])
    expect(c.text.toUpperCase()).toContain('PING')
  }, 60000)

  it('describes an image (vision)', async () => {
    const c = collect()
    if (!IMG) return
    const png = readFileSync(IMG).toString('base64')
    await streamChat(
      { ...base, messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,' + png } },
        { type: 'text', text: 'Name the colors of the shapes you see. Include the word red if a red shape is present.' }
      ] }] },
      KEY!, 'singapore', c.sink, new AbortController().signal
    )
    expect(c.events).toEqual(['done'])
    expect(c.text.toLowerCase()).toContain('red')
  }, 60000)

  it('transcribes a WebM/Opus recording without conversion', async () => {
    if (!WEBM) return
    const buf = readFileSync(WEBM)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const text = await transcribeAlibabaAudio(ab, 'audio/webm', KEY!, 'singapore')
    expect(text.toLowerCase()).toMatch(/quick brown fox/)
  }, 60000)
})
