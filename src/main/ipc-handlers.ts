import { ipcMain, BrowserWindow } from 'electron'
import type { ChatRequest, Settings } from '../shared/ipc'
import { captureScreen } from './screenshot'
import { streamChat, transcribeAlibabaAudio, transcribeAudio } from './openai'
import { streamGeminiChat, transcribeGeminiAudio } from './gemini'
import { store, getSystemPrompts, saveSystemPrompt, deleteSystemPrompt } from './store'
import { getAuthStatus, isUnlocked, verifyPassword } from './auth'
import { getApiKey, getApiKeyPresence, isKeyStorageEncrypted, setApiKey } from './secrets'
import { isProvider, sanitizeSettingsUpdate } from './settings-validation'
import type { StreamSink } from './stream'
import { normalizeAudioMimeType } from './audio'

// Wraps an invoke handler so it refuses to run until the launch password has been accepted.
function locked<T extends unknown[], R>(fn: (...args: T) => R): (...args: T) => R {
  return (...args: T) => {
    if (!isUnlocked()) throw new Error('Locked: enter the launch password first')
    return fn(...args)
  }
}

function isString(value: unknown, maxLength = Infinity): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

function assertChatRequest(value: unknown): asserts value is ChatRequest {
  const r = value as Partial<ChatRequest> | null
  if (
    !r ||
    !isString(r.requestId, 100) ||
    !isString(r.model, 200) ||
    !isString(r.systemPrompt) ||
    !isProvider(r.provider) ||
    !isString(r.reasoningEffort) ||
    !Array.isArray(r.messages)
  ) {
    throw new Error('Invalid chat request')
  }
}

// In-flight chat streams, keyed by the renderer-generated request id.
const activeStreams = new Map<string, AbortController>()

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  const send = (channel: string, ...args: unknown[]): void => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args)
  }

  // Launch password
  ipcMain.handle('verify-password', (_event, password: unknown) => verifyPassword(password))
  ipcMain.handle('auth-status', () => getAuthStatus())

  // Window controls
  ipcMain.on('window-minimize', () => {
    mainWindow.hide()
  })

  ipcMain.on('window-close', () => {
    mainWindow.close()
  })

  ipcMain.on('set-opacity', (_event, opacity: unknown) => {
    if (typeof opacity !== 'number' || !Number.isFinite(opacity)) return
    mainWindow.setOpacity(Math.max(0.1, Math.min(1, opacity)))
  })

  ipcMain.on('set-always-on-top', (_event, value: unknown) => {
    if (typeof value === 'boolean') mainWindow.setAlwaysOnTop(value)
  })

  // Screenshot
  ipcMain.handle('capture-screenshot', locked(async () => {
    return captureScreen(mainWindow)
  }))

  // Chat
  ipcMain.handle('chat-send', locked(async (_event, request: unknown) => {
    assertChatRequest(request)
    const { requestId } = request

    activeStreams.get(requestId)?.abort()
    const controller = new AbortController()
    activeStreams.set(requestId, controller)

    const sink: StreamSink = {
      chunk: text => send('chat-stream-chunk', requestId, text),
      done: () => send('chat-stream-done', requestId),
      error: message => send('chat-stream-error', requestId, message)
    }

    try {
      const apiKey = getApiKey(request.provider)
      if (request.provider === 'gemini') {
        await streamGeminiChat(request, apiKey, sink, controller.signal)
      } else {
        await streamChat(
          { ...request, provider: request.provider },
          apiKey,
          store.get('alibabaRegion'),
          sink,
          controller.signal
        )
      }
    } finally {
      if (activeStreams.get(requestId) === controller) activeStreams.delete(requestId)
    }
  }))

  ipcMain.on('chat-cancel', (_event, requestId: unknown) => {
    if (typeof requestId !== 'string') return
    activeStreams.get(requestId)?.abort()
    activeStreams.delete(requestId)
  })

  // Whisper / Gemini STT
  ipcMain.handle('transcribe-audio', locked(async (
    _event,
    payload: { audioBuffer: unknown; provider: unknown; mimeType: unknown }
  ) => {
    const { audioBuffer, provider } = payload ?? {}
    const mimeType = normalizeAudioMimeType(payload?.mimeType)
    if (!(audioBuffer instanceof ArrayBuffer) || !isProvider(provider) || !mimeType) {
      throw new Error('Invalid transcription request')
    }
    const apiKey = getApiKey(provider)
    switch (provider) {
      case 'gemini':
        return transcribeGeminiAudio(audioBuffer, mimeType, apiKey)
      case 'alibaba':
        return transcribeAlibabaAudio(audioBuffer, mimeType, apiKey, store.get('alibabaRegion'))
      default:
        return transcribeAudio(audioBuffer, mimeType, apiKey, provider)
    }
  }))

  // Settings
  ipcMain.handle('get-settings', locked((): Settings => {
    return {
      provider: store.get('provider'),
      alibabaRegion: store.get('alibabaRegion'),
      model: store.get('model'),
      opacity: store.get('opacity'),
      fontSize: store.get('fontSize'),
      sttProvider: store.get('sttProvider'),
      reasoningEffort: store.get('reasoningEffort'),
      activeSystemPromptId: store.get('activeSystemPromptId'),
      hasApiKey: getApiKeyPresence(),
      keyStorageEncrypted: isKeyStorageEncrypted()
    }
  }))

  ipcMain.on('save-settings', (_event, settings: unknown) => {
    if (!isUnlocked()) return
    for (const [key, value] of Object.entries(sanitizeSettingsUpdate(settings))) {
      store.set(key, value)
    }
  })

  // API keys are write-only from the renderer's point of view.
  ipcMain.handle('set-api-key', locked((_event, provider: unknown, key: unknown) => {
    if (!isProvider(provider) || !isString(key, 500)) throw new Error('Invalid API key update')
    setApiKey(provider, key)
    return getApiKeyPresence()
  }))

  // System prompts
  ipcMain.handle('get-system-prompts', locked(() => {
    return getSystemPrompts()
  }))

  ipcMain.handle('save-system-prompt', locked((_event, prompt: { id?: unknown; name: unknown; content: unknown }) => {
    if (
      !prompt ||
      !isString(prompt.name, 200) ||
      !isString(prompt.content, 100_000) ||
      (prompt.id !== undefined && !isString(prompt.id, 200))
    ) {
      throw new Error('Invalid system prompt')
    }
    return saveSystemPrompt({ id: prompt.id, name: prompt.name, content: prompt.content })
  }))

  ipcMain.handle('delete-system-prompt', locked((_event, id: unknown) => {
    if (!isString(id, 200)) throw new Error('Invalid system prompt id')
    return deleteSystemPrompt(id)
  }))
}
