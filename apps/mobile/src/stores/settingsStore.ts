import { create } from 'zustand'
import type { Provider, ReasoningEffort } from '../lib/types'
import { DEFAULT_MODEL } from '../lib/types'
import { getApiKey, setApiKey as persistApiKey, loadPersistedSettings, savePersistedSettings } from '../lib/storage'

interface SettingsState {
  hasApiKey: Record<Provider, boolean>
  provider: Provider
  model: string
  fontSize: number
  reasoningEffort: ReasoningEffort
  systemPrompt: string
  showSettings: boolean
  loaded: boolean

  loadSettings: () => Promise<void>
  setApiKey: (provider: Provider, key: string) => Promise<void>
  getApiKeyValue: (provider: Provider) => Promise<string | null>
  setProvider: (provider: Provider) => void
  setModel: (model: string) => void
  setFontSize: (size: number) => void
  setReasoningEffort: (effort: ReasoningEffort) => void
  setSystemPrompt: (prompt: string) => void
  setShowSettings: (show: boolean) => void
}

async function persist(state: SettingsState) {
  await savePersistedSettings({
    provider: state.provider,
    model: state.model,
    systemPrompt: state.systemPrompt,
    reasoningEffort: state.reasoningEffort,
    fontSize: state.fontSize
  })
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hasApiKey: { openai: false, gemini: false },
  provider: 'openai',
  model: DEFAULT_MODEL.openai,
  fontSize: 14,
  reasoningEffort: 'medium',
  systemPrompt: 'You are a helpful AI assistant.',
  showSettings: false,
  loaded: false,

  loadSettings: async () => {
    const saved = await loadPersistedSettings()
    const [openaiKey, geminiKey] = await Promise.all([getApiKey('openai'), getApiKey('gemini')])

    set({
      provider: saved?.provider ?? 'openai',
      model: saved?.model ?? DEFAULT_MODEL[saved?.provider ?? 'openai'],
      systemPrompt: saved?.systemPrompt ?? 'You are a helpful AI assistant.',
      reasoningEffort: (saved?.reasoningEffort as ReasoningEffort) ?? 'medium',
      fontSize: saved?.fontSize ?? 14,
      hasApiKey: { openai: !!openaiKey, gemini: !!geminiKey },
      loaded: true
    })
  },

  setApiKey: async (provider, key) => {
    await persistApiKey(provider, key)
    set(state => ({ hasApiKey: { ...state.hasApiKey, [provider]: !!key } }))
  },

  getApiKeyValue: (provider) => getApiKey(provider),

  setProvider: (provider) => {
    set({ provider, model: DEFAULT_MODEL[provider] })
    void persist(get())
  },

  setModel: (model) => {
    set({ model })
    void persist(get())
  },

  setFontSize: (fontSize) => {
    set({ fontSize })
    void persist(get())
  },

  setReasoningEffort: (reasoningEffort) => {
    set({ reasoningEffort })
    void persist(get())
  },

  setSystemPrompt: (systemPrompt) => {
    set({ systemPrompt })
    void persist(get())
  },

  setShowSettings: (showSettings) => set({ showSettings })
}))
