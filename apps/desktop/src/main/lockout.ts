// Pure lockout policy for the launch password, kept separate from Electron so it can be unit-tested.

export const MAX_ATTEMPTS = 5

// Lockout after each full round of failed attempts: 1 min, 5 min, 15 min, then 1 hour.
const LOCKOUT_STEPS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

export interface LockoutState {
  failures: number
  lockedUntil: number
}

export const INITIAL_LOCKOUT_STATE: LockoutState = { failures: 0, lockedUntil: 0 }

export function lockedForMs(state: LockoutState, now: number): number {
  return Math.max(0, state.lockedUntil - now)
}

export function remainingAttempts(state: LockoutState): number {
  return MAX_ATTEMPTS - (state.failures % MAX_ATTEMPTS)
}

export function recordFailure(state: LockoutState, now: number): LockoutState {
  const failures = state.failures + 1
  if (failures % MAX_ATTEMPTS !== 0) return { failures, lockedUntil: state.lockedUntil }

  const round = failures / MAX_ATTEMPTS - 1
  const step = LOCKOUT_STEPS_MS[Math.min(round, LOCKOUT_STEPS_MS.length - 1)]
  return { failures, lockedUntil: now + step }
}

// Linear back-off within a round slows down scripted guessing.
export function failureDelayMs(state: LockoutState): number {
  const inRound = state.failures % MAX_ATTEMPTS || MAX_ATTEMPTS
  return 1000 * inRound
}
