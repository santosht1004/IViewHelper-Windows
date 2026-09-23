import { app } from 'electron'
import { scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import type { AuthStatus, UnlockResult } from '../shared/ipc'
import { store } from './store'
import {
  failureDelayMs,
  INITIAL_LOCKOUT_STATE,
  lockedForMs,
  recordFailure,
  remainingAttempts
} from './lockout'

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>

// Launch password. Only a salted scrypt hash is embedded; the plaintext is never stored.
// To change the password, regenerate SALT + HASH with:
//   node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s, c.scryptSync(process.argv[1], s, 64).toString('hex'))" 'new-password'
const SALT = '389713a2579ccf7628f9a22e8acd2eb6'
const HASH = Buffer.from(
  '44d807032400c20e8d0803986368d5e2d09f388716dcfd43807e3edc5276e36d69ac147630a4701c2851f79a8ea27836eca872bfb8d0b53ebd81a4dd1ba37b83',
  'hex'
)

let unlocked = false
let verifying = false
let unlockListeners: Array<() => void> = []

export function isUnlocked(): boolean {
  return unlocked
}

export function onUnlock(listener: () => void): void {
  unlockListeners.push(listener)
}

export function getAuthStatus(): AuthStatus {
  // Failure count and lockout are persisted so restarting the app does not reset them.
  const state = store.get('authState')
  return {
    unlocked,
    remaining: remainingAttempts(state),
    lockedForMs: lockedForMs(state, Date.now())
  }
}

export async function verifyPassword(password: unknown): Promise<UnlockResult> {
  const status = getAuthStatus()
  if (status.lockedForMs > 0 || verifying) {
    return { ok: false, remaining: status.remaining, lockedForMs: status.lockedForMs }
  }

  verifying = true
  try {
    const candidate = typeof password === 'string' ? password : ''
    const derived = await scryptAsync(candidate, SALT, HASH.length)
    const ok = derived.length === HASH.length && timingSafeEqual(derived, HASH)

    if (ok) {
      store.set('authState', INITIAL_LOCKOUT_STATE)
      if (!unlocked) {
        unlocked = true
        const listeners = unlockListeners
        unlockListeners = []
        for (const l of listeners) l()
      }
      return { ok: true, remaining: remainingAttempts(INITIAL_LOCKOUT_STATE), lockedForMs: 0 }
    }

    const next = recordFailure(store.get('authState'), Date.now())
    store.set('authState', next)

    await new Promise(resolve => setTimeout(resolve, failureDelayMs(next)))

    const lockedFor = lockedForMs(next, Date.now())
    if (lockedFor > 0) {
      setTimeout(() => app.quit(), 1500)
    }

    return { ok: false, remaining: lockedFor > 0 ? 0 : remainingAttempts(next), lockedForMs: lockedFor }
  } finally {
    verifying = false
  }
}
