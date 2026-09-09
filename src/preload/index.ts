import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Launch password
  verifyPassword: (password: string): Promise<{ ok: boolean; remaining: number }> =>
    ipcRenderer.invoke('verify-password', password),
  isUnlocked: (): Promise<boolean> => ipcRenderer.invoke('is-unlocked'),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  setOpacity: (opacity: number) => ipcRenderer.send('set-opacity', opacity),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.send('set-always-on-top', value),

  // Screenshot
  captureScreenshot: (): Promise<string> => ipcRenderer.invoke('capture-screenshot'),

  // OpenAI chat
  sendChat: (payload: {
    messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    model: string;
    systemPrompt: string;
    apiKey: string;
    provider: string;
    reasoningEffort: 'off' | 'minimal' | 'low' | 'medium' | 'high';
  }): Promise<void> => ipcRenderer.invoke('openai-chat', payload),

  onStreamChunk: (callback: (chunk: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('openai-stream-chunk', handler)
    return () => ipcRenderer.removeListener('openai-stream-chunk', handler)
  },

  onStreamDone: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('openai-stream-done', handler)
    return () => ipcRenderer.removeListener('openai-stream-done', handler)
  },

  onStreamError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('openai-stream-error', handler)
    return () => ipcRenderer.removeListener('openai-stream-error', handler)
  },

  // Whisper STT
  whisperTranscribe: (audioBuffer: ArrayBuffer, apiKey: string, provider: string): Promise<string> =>
    ipcRenderer.invoke('whisper-transcribe', { audioBuffer, apiKey, provider }),

  // Settings
  getSettings: (): Promise<{
    apiKey: string;
    provider: 'openai' | 'groq';
    model: string;
    opacity: number;
    fontSize: number;
    sttProvider: 'whisper';
    reasoningEffort: 'off' | 'minimal' | 'low' | 'medium' | 'high';
    activeSystemPromptId: string | null;
  }> => ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.send('save-settings', settings),

  // System prompts
  getSystemPrompts: (): Promise<Array<{
    id: string;
    name: string;
    content: string;
    isDefault: boolean;
  }>> => ipcRenderer.invoke('get-system-prompts'),

  saveSystemPrompt: (prompt: { id?: string; name: string; content: string }) =>
    ipcRenderer.invoke('save-system-prompt', prompt),

  deleteSystemPrompt: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-system-prompt', id),

  // Shortcuts from main process
  onToggleMic: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut-toggle-mic', handler)
    return () => ipcRenderer.removeListener('shortcut-toggle-mic', handler)
  },

  onScreenshotShortcut: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut-screenshot', handler)
    return () => ipcRenderer.removeListener('shortcut-screenshot', handler)
  },

  onClearChat: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut-clear-chat', handler)
    return () => ipcRenderer.removeListener('shortcut-clear-chat', handler)
  },

  onClearInput: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut-clear-input', handler)
    return () => ipcRenderer.removeListener('shortcut-clear-input', handler)
  },

  onFocusInput: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut-focus-input', handler)
    return () => ipcRenderer.removeListener('shortcut-focus-input', handler)
  },

  onFindInChat: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut-find-in-chat', handler)
    return () => ipcRenderer.removeListener('shortcut-find-in-chat', handler)
  },

  onScroll: (callback: (direction: 'up' | 'down') => void) => {
    const handler = (_event: Electron.IpcRendererEvent, direction: 'up' | 'down') => callback(direction)
    ipcRenderer.on('shortcut-scroll', handler)
    return () => ipcRenderer.removeListener('shortcut-scroll', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
