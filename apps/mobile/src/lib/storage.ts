import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Provider } from './types'

const API_KEY_PREFIX = 'apiKey_'
const SETTINGS_KEY = 'ih_settings'

// API keys go through the OS keystore (Keychain/Keystore), never AsyncStorage.
export async function getApiKey(provider: Provider): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_PREFIX + provider)
}

export async function setApiKey(provider: Provider, key: string): Promise<void> {
  if (!key) {
    await SecureStore.deleteItemAsync(API_KEY_PREFIX + provider)
    return
  }
  await SecureStore.setItemAsync(API_KEY_PREFIX + provider, key)
}

export interface PersistedSettings {
  provider: Provider
  model: string
  systemPrompt: string
  reasoningEffort: string
  fontSize: number
}

export async function loadPersistedSettings(): Promise<Partial<PersistedSettings> | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY)
  return raw ? JSON.parse(raw) : null
}

export async function savePersistedSettings(settings: PersistedSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
