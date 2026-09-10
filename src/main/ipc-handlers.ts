import { ipcMain, BrowserWindow } from 'electron'
import { captureScreen } from './screenshot'
import { streamChat, transcribeAudio } from './openai'
import { streamGeminiChat, transcribeGeminiAudio } from './gemini'
import { store, getSystemPrompts, saveSystemPrompt, deleteSystemPrompt } from './store'
import { isUnlocked, verifyPassword } from './auth'

// Wraps an invoke handler so it refuses to run until the launch password has been accepted.
function locked<T extends unknown[], R>(fn: (...args: T) => R): (...args: T) => R {
  return (...args: T) => {
    if (!isUnlocked()) throw new Error('Locked: enter the launch password first')
    return fn(...args)
  }
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Launch password
  ipcMain.handle('verify-password', (_event, password: unknown) => verifyPassword(password))
  ipcMain.handle('is-unlocked', () => isUnlocked())

  // Window controls
  ipcMain.on('window-minimize', () => {
    mainWindow.hide()
  })

  ipcMain.on('window-close', () => {
    mainWindow.close()
  })

  ipcMain.on('set-opacity', (_event, opacity: number) => {
    mainWindow.setOpacity(Math.max(0.1, Math.min(1, opacity)))
  })

  ipcMain.on('set-always-on-top', (_event, value: boolean) => {
    mainWindow.setAlwaysOnTop(value)
  })

  // Screenshot
  ipcMain.handle('capture-screenshot', locked(async () => {
    return captureScreen(mainWindow)
  }))

  // Chat
  ipcMain.handle('openai-chat', locked(async (_event, payload: {
    messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    model: string;
    systemPrompt: string;
    apiKey: string;
    provider: string;
    reasoningEffort: 'off' | 'minimal' | 'low' | 'medium' | 'high';
  }) => {
    if (payload.provider === 'gemini') {
      return streamGeminiChat(mainWindow, payload)
    }
    return streamChat(mainWindow, payload)
  }))

  // Whisper / Gemini STT
  ipcMain.handle('whisper-transcribe', locked(async (_event, payload: {
    audioBuffer: ArrayBuffer;
    apiKey: string;
    provider: string;
  }) => {
    if (payload.provider === 'gemini') {
      return transcribeGeminiAudio(payload.audioBuffer, payload.apiKey)
    }
    return transcribeAudio(payload.audioBuffer, payload.apiKey, payload.provider)
  }))

  // Settings
  ipcMain.handle('get-settings', locked(() => {
    const provider = store.get('provider', 'openai')
    const legacyKey = store.get('apiKey', '')
    const savedApiKeys = store.get('apiKeys', {
      openai: provider === 'openai' ? legacyKey : '',
      groq: provider === 'groq' ? legacyKey : '',
      gemini: provider === 'gemini' ? legacyKey : ''
    })

    return {
      apiKey: savedApiKeys[provider] || legacyKey,
      apiKeys: savedApiKeys,
      provider,
      model: store.get('model', 'gpt-5.4'),
      opacity: store.get('opacity', 0.95),
      fontSize: store.get('fontSize', 14),
      sttProvider: store.get('sttProvider', 'whisper'),
      reasoningEffort: store.get('reasoningEffort', 'medium'),
      activeSystemPromptId: store.get('activeSystemPromptId', null)
    }
  }))

  ipcMain.on('save-settings', (_event, settings: Record<string, unknown>) => {
    if (!isUnlocked()) return
    for (const [key, value] of Object.entries(settings)) {
      store.set(key, value)
    }
  })

  // System prompts
  ipcMain.handle('get-system-prompts', locked(() => {
    return getSystemPrompts()
  }))

  ipcMain.handle('save-system-prompt', locked((_event, prompt: {
    id?: string;
    name: string;
    content: string;
  }) => {
    return saveSystemPrompt(prompt)
  }))

  ipcMain.handle('delete-system-prompt', locked((_event, id: string) => {
    return deleteSystemPrompt(id)
  }))
}
