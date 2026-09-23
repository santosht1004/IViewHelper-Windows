import { create } from 'zustand'
import type { AlibabaRegion, SystemPrompt, STTProvider, ReasoningEffort, Provider } from '../lib/types'

interface SettingsState {
  hasApiKey: Record<Provider, boolean>
  keyStorageEncrypted: boolean
  provider: Provider
  alibabaRegion: AlibabaRegion
  model: string
  opacity: number
  fontSize: number
  sttProvider: STTProvider
  reasoningEffort: ReasoningEffort
  activeSystemPromptId: string | null
  systemPrompts: SystemPrompt[]
  showSettings: boolean
  loaded: boolean

  loadSettings: () => Promise<void>
  setApiKey: (key: string) => Promise<void>
  setProvider: (provider: Provider) => void
  setAlibabaRegion: (region: AlibabaRegion) => void
  setModel: (model: string) => void
  setOpacity: (opacity: number) => void
  setFontSize: (size: number) => void
  setReasoningEffort: (effort: ReasoningEffort) => void
  setActiveSystemPromptId: (id: string) => void
  setShowSettings: (show: boolean) => void
  loadSystemPrompts: () => Promise<void>
  saveSystemPrompt: (prompt: { id?: string; name: string; content: string }) => Promise<void>
  deleteSystemPrompt: (id: string) => Promise<void>
  getActivePromptContent: () => string
}

function applyFontSize(size: number) {
  document.documentElement.style.setProperty('--font-size', `${size}px`)
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hasApiKey: {
    openai: false,
    groq: false,
    gemini: false,
    alibaba: false
  },
  keyStorageEncrypted: true,
  provider: 'openai',
  alibabaRegion: 'singapore',
  model: 'gpt-5.4',
  opacity: 0.95,
  fontSize: 14,
  sttProvider: 'whisper',
  reasoningEffort: 'medium',
  activeSystemPromptId: 'default-general',
  systemPrompts: [],
  showSettings: false,
  loaded: false,

  loadSettings: async () => {
    const settings = await window.electronAPI.getSettings()
    const prompts = await window.electronAPI.getSystemPrompts()
    const fontSize = settings.fontSize ?? 14
    applyFontSize(fontSize)

    set({
      hasApiKey: settings.hasApiKey,
      keyStorageEncrypted: settings.keyStorageEncrypted,
      provider: settings.provider,
      alibabaRegion: settings.alibabaRegion,
      model: settings.model,
      opacity: settings.opacity,
      fontSize,
      sttProvider: settings.sttProvider,
      reasoningEffort: settings.reasoningEffort ?? 'medium',
      activeSystemPromptId: settings.activeSystemPromptId,
      systemPrompts: prompts,
      loaded: true
    })
    window.electronAPI.setOpacity(settings.opacity)
  },

  // The key is sent to the main process for encrypted storage and never kept in renderer state.
  setApiKey: async (key) => {
    const hasApiKey = await window.electronAPI.setApiKey(get().provider, key)
    set({ hasApiKey })
  },

  setProvider: (provider) => {
    set({ provider })
    window.electronAPI.saveSettings({ provider })
  },

  setAlibabaRegion: (alibabaRegion) => {
    set({ alibabaRegion })
    window.electronAPI.saveSettings({ alibabaRegion })
  },

  setModel: (model) => {
    set({ model })
    window.electronAPI.saveSettings({ model })
  },

  setOpacity: (opacity) => {
    set({ opacity })
    window.electronAPI.setOpacity(opacity)
    window.electronAPI.saveSettings({ opacity })
  },

  setFontSize: (fontSize) => {
    set({ fontSize })
    applyFontSize(fontSize)
    window.electronAPI.saveSettings({ fontSize })
  },

  setReasoningEffort: (effort) => {
    set({ reasoningEffort: effort })
    window.electronAPI.saveSettings({ reasoningEffort: effort })
  },

  setActiveSystemPromptId: (id) => {
    set({ activeSystemPromptId: id })
    window.electronAPI.saveSettings({ activeSystemPromptId: id })
  },

  setShowSettings: (show) => set({ showSettings: show }),

  loadSystemPrompts: async () => {
    const prompts = await window.electronAPI.getSystemPrompts()
    set({ systemPrompts: prompts })
  },

  saveSystemPrompt: async (prompt) => {
    await window.electronAPI.saveSystemPrompt(prompt)
    const prompts = await window.electronAPI.getSystemPrompts()
    set({ systemPrompts: prompts })
  },

  deleteSystemPrompt: async (id) => {
    await window.electronAPI.deleteSystemPrompt(id)
    const prompts = await window.electronAPI.getSystemPrompts()
    set({ systemPrompts: prompts })
  },

  getActivePromptContent: () => {
    const { systemPrompts, activeSystemPromptId } = get()
    const prompt = systemPrompts.find(p => p.id === activeSystemPromptId)
    return prompt?.content || ''
  }
}))
