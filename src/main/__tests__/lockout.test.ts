import { describe, expect, it } from 'vitest'
import {
  failureDelayMs,
  INITIAL_LOCKOUT_STATE,
  lockedForMs,
  MAX_ATTEMPTS,
  recordFailure,
  remainingAttempts,
  type LockoutState
} from '../lockout'

function fail(times: number, state: LockoutState = INITIAL_LOCKOUT_STATE, now = 0): LockoutState {
  for (let i = 0; i < times; i++) state = recordFailure(state, now)
  return state
}

describe('lockout policy', () => {
  it('counts down remaining attempts without locking before the limit', () => {
    const state = fail(MAX_ATTEMPTS - 1)
    expect(remainingAttempts(state)).toBe(1)
    expect(lockedForMs(state, 0)).toBe(0)
  })

  it('locks for one minute after the first full round of failures', () => {
    const state = fail(MAX_ATTEMPTS, INITIAL_LOCKOUT_STATE, 1_000)
    expect(lockedForMs(state, 1_000)).toBe(60_000)
    expect(lockedForMs(state, 61_000)).toBe(0)
  })

  it('escalates lockouts on later rounds and caps at one hour', () => {
    expect(lockedForMs(fail(MAX_ATTEMPTS * 2), 0)).toBe(5 * 60_000)
    expect(lockedForMs(fail(MAX_ATTEMPTS * 3), 0)).toBe(15 * 60_000)
    expect(lockedForMs(fail(MAX_ATTEMPTS * 4), 0)).toBe(60 * 60_000)
    expect(lockedForMs(fail(MAX_ATTEMPTS * 10), 0)).toBe(60 * 60_000)
  })

  it('gives a fresh round of attempts once a lockout has been served', () => {
    expect(remainingAttempts(fail(MAX_ATTEMPTS))).toBe(MAX_ATTEMPTS)
  })

  it('backs off linearly within a round', () => {
    expect(failureDelayMs(fail(1))).toBe(1000)
    expect(failureDelayMs(fail(MAX_ATTEMPTS))).toBe(MAX_ATTEMPTS * 1000)
    expect(failureDelayMs(fail(MAX_ATTEMPTS + 1))).toBe(1000)
  })
})
