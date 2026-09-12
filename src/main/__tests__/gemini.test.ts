import { describe, expect, it } from 'vitest'
import { parseSseLine, toGeminiContents } from '../gemini'

describe('toGeminiContents', () => {
  it('maps roles and splits data-URL images into inline data', () => {
    expect(
      toGeminiContents([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'what is this?' },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } }
          ]
        },
        { role: 'assistant', content: 'a cat' }
      ])
    ).toEqual([
      {
        role: 'user',
        parts: [{ text: 'what is this?' }, { inline_data: { mime_type: 'image/jpeg', data: 'QUJD' } }]
      },
      { role: 'model', parts: [{ text: 'a cat' }] }
    ])
  })

  it('skips messages with no content instead of sending empty parts', () => {
    expect(
      toGeminiContents([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: '' }
      ])
    ).toEqual([{ role: 'user', parts: [{ text: 'hi' }] }])
  })
})

describe('parseSseLine', () => {
  it('joins text parts from a data line', () => {
    const line = 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hel' }, { text: 'lo' }] } }] })
    expect(parseSseLine(line)).toBe('Hello')
  })

  it('ignores non-data lines, [DONE], and malformed JSON', () => {
    expect(parseSseLine('event: ping')).toBe('')
    expect(parseSseLine('data: [DONE]')).toBe('')
    expect(parseSseLine('data: {"candidates": [')).toBe('')
  })
})
