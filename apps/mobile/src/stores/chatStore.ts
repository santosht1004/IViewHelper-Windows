import { create } from 'zustand'
import type { Message } from '../lib/types'

interface ChatState {
  messages: Message[]
  pendingImages: string[]
  isStreaming: boolean
  activeRequestId: string | null
  streamingContent: string
  error: string | null
  abortController: AbortController | null

  addUserMessage: (content: string, images: string[]) => void
  startStream: () => { requestId: string; signal: AbortSignal }
  appendStreamChunk: (requestId: string, chunk: string) => void
  finalizeStream: (requestId: string) => void
  setStreamError: (requestId: string, error: string) => void
  cancelStream: () => void
  addImage: (base64: string) => void
  removeImage: (index: number) => void
  clearImages: () => void
  clearChat: () => void
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  pendingImages: [],
  isStreaming: false,
  activeRequestId: null,
  streamingContent: '',
  error: null,
  abortController: null,

  addUserMessage: (content, images) => {
    const msg: Message = { id: uuid(), role: 'user', content, images, timestamp: Date.now() }
    set(state => ({ messages: [...state.messages, msg], error: null }))
  },

  startStream: () => {
    get().abortController?.abort()
    const controller = new AbortController()
    const requestId = uuid()
    set({
      isStreaming: true,
      activeRequestId: requestId,
      streamingContent: '',
      error: null,
      abortController: controller
    })
    return { requestId, signal: controller.signal }
  },

  appendStreamChunk: (requestId, chunk) => {
    if (requestId !== get().activeRequestId) return
    set(state => ({ streamingContent: state.streamingContent + chunk }))
  },

  finalizeStream: (requestId) => {
    const { streamingContent, activeRequestId } = get()
    if (requestId !== activeRequestId) return
    const msg: Message = { id: uuid(), role: 'assistant', content: streamingContent, images: [], timestamp: Date.now() }
    set(state => ({
      messages: [...state.messages, msg],
      isStreaming: false,
      activeRequestId: null,
      streamingContent: '',
      abortController: null
    }))
  },

  setStreamError: (requestId, error) => {
    if (requestId !== get().activeRequestId) return
    set({ isStreaming: false, activeRequestId: null, streamingContent: '', error, abortController: null })
  },

  cancelStream: () => {
    get().abortController?.abort()
    set({ isStreaming: false, activeRequestId: null, streamingContent: '', abortController: null })
  },

  addImage: (base64) => set(state => ({ pendingImages: [...state.pendingImages, base64] })),

  removeImage: (index) =>
    set(state => ({ pendingImages: state.pendingImages.filter((_, i) => i !== index) })),

  clearImages: () => set({ pendingImages: [] }),

  clearChat: () => {
    get().abortController?.abort()
    set({ messages: [], streamingContent: '', isStreaming: false, activeRequestId: null, error: null, abortController: null })
  }
}))
