import { safeStorage } from 'electron'
import { PROVIDERS, type Provider } from '../shared/ipc'
import { isProvider } from './settings-validation'
import { store } from './store'

// API keys are encrypted with the OS keychain (safeStorage) and only ever decrypted
// in the main process. These functions must be called after app 'ready'.

const ENC_PREFIX = 'enc:'
const PLAIN_PREFIX = 'plain:'

export function isKeyStorageEncrypted(): boolean {
  return safeStorage.isEncryptionAvailable()
}

function encode(key: string): string {
  if (isKeyStorageEncrypted()) {
    return ENC_PREFIX + safeStorage.encryptString(key).toString('base64')
  }
  console.warn('[secrets] OS encryption unavailable; storing API key unencrypted')
  return PLAIN_PREFIX + key
}

function decode(value: string): string {
  if (value.startsWith(ENC_PREFIX)) {
    try {
      return safeStorage.decryptString(Buffer.from(value.slice(ENC_PREFIX.length), 'base64'))
    } catch (err) {
      console.error('[secrets] Failed to decrypt stored API key:', err)
      return ''
    }
  }
  if (value.startsWith(PLAIN_PREFIX)) return value.slice(PLAIN_PREFIX.length)
  return ''
}

export function getApiKey(provider: Provider): string {
  const stored = store.get('secureApiKeys')[provider]
  return stored ? decode(stored) : ''
}

export function setApiKey(provider: Provider, key: string): void {
  const secureApiKeys = { ...store.get('secureApiKeys') }
  const trimmed = key.trim()
  if (trimmed) secureApiKeys[provider] = encode(trimmed)
  else delete secureApiKeys[provider]
  store.set('secureApiKeys', secureApiKeys)
}

export function getApiKeyPresence(): Record<Provider, boolean> {
  const stored = store.get('secureApiKeys')
  return Object.fromEntries(PROVIDERS.map(p => [p, Boolean(stored[p])])) as Record<Provider, boolean>
}

// Move keys saved in plaintext by earlier versions into encrypted storage.
export function migrateLegacyApiKeys(): void {
  const legacyKeys = store.get('apiKeys')
  const legacyKey = store.get('apiKey')
  if (legacyKeys === undefined && legacyKey === undefined) return

  const existing = store.get('secureApiKeys')
  for (const [provider, key] of Object.entries(legacyKeys ?? {})) {
    if (isProvider(provider) && key && !existing[provider]) setApiKey(provider, key)
  }
  const provider = store.get('provider')
  if (legacyKey && !store.get('secureApiKeys')[provider]) setApiKey(provider, legacyKey)

  store.delete('apiKeys')
  store.delete('apiKey')
}
