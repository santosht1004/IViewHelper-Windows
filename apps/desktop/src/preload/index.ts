import { contextBridge, ipcRenderer } from 'electron'
import type {
  AuthStatus,
  ChatRequest,
  Provider,
  Settings,
  SettingsUpdate,
  SystemPrompt,
  UnlockResult
} from '../shared/ipc'

function subscribe<A extends unknown[]>(channel: string, callback: (...args: A) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...(args as A))
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api = {
  // Launch password
  verifyPassword: (password: string): Promise<UnlockResult> => ipcRenderer.invoke('verify-password', password),
  getAuthStatus: (): Promise<AuthStatus> => ipcRenderer.invoke('auth-status'),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  setOpacity: (opacity: number) => ipcRenderer.send('set-opacity', opacity),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.send('set-always-on-top', value),

  // Screenshot
  captureScreenshot: (): Promise<string> => ipcRenderer.invoke('capture-screenshot'),

  // Chat. Stream events carry the request id so stale or cancelled streams can be ignored.
  sendChat: (request: ChatRequest): Promise<void> => ipcRenderer.invoke('chat-send', request),
  cancelChat: (requestId: string) => ipcRenderer.send('chat-cancel', requestId),
  onStreamChunk: (callback: (requestId: string, chunk: string) => void) =>
    subscribe('chat-stream-chunk', callback),
  onStreamDone: (callback: (requestId: string) => void) => subscribe('chat-stream-done', callback),
  onStreamError: (callback: (requestId: string, error: string) => void) =>
    subscribe('chat-stream-error', callback),

  // Speech-to-text. The main process picks the stored key for the provider.
  // The recording is sent in the recorder's own format (no conversion).
  transcribeAudio: (audioBuffer: ArrayBuffer, provider: Provider, mimeType: string): Promise<string> =>
    ipcRenderer.invoke('transcribe-audio', { audioBuffer, provider, mimeType }),

  // Settings
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: SettingsUpdate) => ipcRenderer.send('save-settings', settings),
  setApiKey: (provider: Provider, key: string): Promise<Record<Provider, boolean>> =>
    ipcRenderer.invoke('set-api-key', provider, key),

  // System prompts
  getSystemPrompts: (): Promise<SystemPrompt[]> => ipcRenderer.invoke('get-system-prompts'),
  saveSystemPrompt: (prompt: { id?: string; name: string; content: string }): Promise<SystemPrompt> =>
    ipcRenderer.invoke('save-system-prompt', prompt),
  deleteSystemPrompt: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-system-prompt', id),

  // Shortcuts from main process
  onToggleMic: (callback: () => void) => subscribe('shortcut-toggle-mic', callback),
  onScreenshotShortcut: (callback: () => void) => subscribe('shortcut-screenshot', callback),
  onClearChat: (callback: () => void) => subscribe('shortcut-clear-chat', callback),
  onClearInput: (callback: () => void) => subscribe('shortcut-clear-input', callback),
  onFocusInput: (callback: () => void) => subscribe('shortcut-focus-input', callback),
  onFindInChat: (callback: () => void) => subscribe('shortcut-find-in-chat', callback),
  onScroll: (callback: (direction: 'up' | 'down') => void) => subscribe('shortcut-scroll', callback)
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
