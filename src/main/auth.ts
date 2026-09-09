import { app } from 'electron'
import { scryptSync, timingSafeEqual } from 'crypto'

// Launch password. Only a salted scrypt hash is embedded; the plaintext is never stored.
// To change the password, regenerate SALT + HASH with:
//   node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s, c.scryptSync(process.argv[1], s, 64).toString('hex'))" 'new-password'
const SALT = '389713a2579ccf7628f9a22e8acd2eb6'
const HASH = Buffer.from(
  '44d807032400c20e8d0803986368d5e2d09f388716dcfd43807e3edc5276e36d69ac147630a4701c2851f79a8ea27836eca872bfb8d0b53ebd81a4dd1ba37b83',
  'hex'
)

const MAX_ATTEMPTS = 5

let unlocked = false
let failures = 0
let unlockListeners: Array<() => void> = []

export function isUnlocked(): boolean {
  return unlocked
}

export function onUnlock(listener: () => void): void {
  unlockListeners.push(listener)
}

export async function verifyPassword(password: unknown): Promise<{ ok: boolean; remaining: number }> {
  if (unlocked) return { ok: true, remaining: MAX_ATTEMPTS }

  const candidate = typeof password === 'string' ? password : ''
  const derived = scryptSync(candidate, SALT, HASH.length)
  const ok = derived.length === HASH.length && timingSafeEqual(derived, HASH)

  if (ok) {
    unlocked = true
    failures = 0
    const listeners = unlockListeners
    unlockListeners = []
    for (const l of listeners) l()
    return { ok: true, remaining: MAX_ATTEMPTS }
  }

  failures++
  const remaining = Math.max(0, MAX_ATTEMPTS - failures)

  // Slow down brute force: linear back-off per failure.
  await new Promise(resolve => setTimeout(resolve, 1000 * failures))

  if (failures >= MAX_ATTEMPTS) {
    setTimeout(() => app.quit(), 300)
  }

  return { ok: false, remaining }
}
