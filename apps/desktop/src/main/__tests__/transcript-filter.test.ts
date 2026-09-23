import { describe, expect, it } from 'vitest'
import { filterHallucinations } from '../transcript-filter'

describe('filterHallucinations', () => {
  it('drops known silence hallucinations regardless of case and punctuation', () => {
    expect(filterHallucinations('Thanks for watching!')).toBe('')
    expect(filterHallucinations('  Um...  ')).toBe('')
    expect(filterHallucinations('')).toBe('')
  })

  it('keeps real speech unchanged', () => {
    expect(filterHallucinations('Thank you, that answers my question.')).toBe('Thank you, that answers my question.')
  })
})
