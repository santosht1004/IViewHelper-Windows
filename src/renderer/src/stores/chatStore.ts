import { create } from 'zustand'
import type { Message } from '../lib/types'

interface ChatState {
  messages: Message[]
  pendingScreenshots: string[]
  isStreaming: boolean
  activeRequestId: string | null
  streamingContent: string
  error: string | null

  addUserMessage: (content: string, screenshots: string[]) => void
  startStream: () => string
  appendStreamChunk: (requestId: string, chunk: string) => void
  finalizeStream: (requestId: string) => void
  setStreamError: (requestId: string, error: string) => void
  addScreenshot: (base64: string) => void
  removeScreenshot: (index: number) => void
  clearScreenshots: () => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  pendingScreenshots: [],
  isStreaming: false,
  activeRequestId: null,
  streamingContent: '',
  error: null,

  addUserMessage: (content, screenshots) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      screenshots,
      timestamp: Date.now()
    }
    set(state => ({ messages: [...state.messages, msg], error: null }))
  },

  startStream: () => {
    const { activeRequestId } = get()
    if (activeRequestId) window.electronAPI.cancelChat(activeRequestId)
    const requestId = crypto.randomUUID()
    set({ isStreaming: true, activeRequestId: requestId, streamingContent: '', error: null })
    return requestId
  },

  // Stream events for any request other than the active one (cancelled, or from before a clear) are ignored.
  appendStreamChunk: (requestId, chunk) => {
    if (requestId !== get().activeRequestId) return
    set(state => ({ streamingContent: state.streamingContent + chunk }))
  },

  finalizeStream: (requestId) => {
    const { streamingContent, activeRequestId } = get()
    if (requestId !== activeRequestId) return
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: streamingContent,
      screenshots: [],
      timestamp: Date.now()
    }
    set(state => ({
      messages: [...state.messages, msg],
      isStreaming: false,
      activeRequestId: null,
      streamingContent: ''
    }))
  },

  setStreamError: (requestId, error) => {
    if (requestId !== get().activeRequestId) return
    set({ isStreaming: false, activeRequestId: null, streamingContent: '', error })
  },

  addScreenshot: (base64) => {
    set(state => ({ pendingScreenshots: [...state.pendingScreenshots, base64] }))
  },

  removeScreenshot: (index) => {
    set(state => ({
      pendingScreenshots: state.pendingScreenshots.filter((_, i) => i !== index)
    }))
  },

  clearScreenshots: () => set({ pendingScreenshots: [] }),

  clearChat: () => {
    const { activeRequestId } = get()
    if (activeRequestId) window.electronAPI.cancelChat(activeRequestId)
    set({ messages: [], streamingContent: '', isStreaming: false, activeRequestId: null, error: null })
  }
}))
