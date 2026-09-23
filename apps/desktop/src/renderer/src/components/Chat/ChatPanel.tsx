import { useEffect } from 'react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ImagePreview } from './ImagePreview'
import { useChatStore } from '../../stores/chatStore'
import { useSettingsStore } from '../../stores/settingsStore'
import type { ChatMessagePayload } from '../../../../shared/ipc'

export function ChatPanel() {
  const addUserMessage = useChatStore(s => s.addUserMessage)
  const startStream = useChatStore(s => s.startStream)
  const appendStreamChunk = useChatStore(s => s.appendStreamChunk)
  const finalizeStream = useChatStore(s => s.finalizeStream)
  const setStreamError = useChatStore(s => s.setStreamError)
  const provider = useSettingsStore(s => s.provider)
  const model = useSettingsStore(s => s.model)
  const reasoningEffort = useSettingsStore(s => s.reasoningEffort)
  const getActivePromptContent = useSettingsStore(s => s.getActivePromptContent)

  // Set up stream listeners
  useEffect(() => {
    const unsubChunk = window.electronAPI.onStreamChunk((requestId, chunk) => {
      appendStreamChunk(requestId, chunk)
    })
    const unsubDone = window.electronAPI.onStreamDone((requestId) => {
      finalizeStream(requestId)
    })
    const unsubError = window.electronAPI.onStreamError((requestId, error) => {
      setStreamError(requestId, error)
    })

    return () => {
      unsubChunk()
      unsubDone()
      unsubError()
    }
  }, [appendStreamChunk, finalizeStream, setStreamError])

  const handleSend = async (content: string, screenshots: string[]) => {
    // Add user message to chat
    addUserMessage(content, screenshots)

    // Build messages for API
    const apiMessages = useChatStore.getState().messages.map((msg): ChatMessagePayload => {
      if (msg.role === 'user' && msg.screenshots.length > 0) {
        const contentParts: Exclude<ChatMessagePayload['content'], string> = []
        if (msg.content) {
          contentParts.push({ type: 'text', text: msg.content })
        }
        for (const screenshot of msg.screenshots) {
          contentParts.push({ type: 'image_url', image_url: { url: screenshot } })
        }
        return { role: msg.role, content: contentParts }
      }
      return { role: msg.role, content: msg.content }
    })

    const requestId = startStream()

    try {
      await window.electronAPI.sendChat({
        requestId,
        messages: apiMessages,
        model,
        systemPrompt: getActivePromptContent(),
        provider,
        reasoningEffort
      })
    } catch (err) {
      // The invoke itself failed (e.g. rejected request), so no stream event will arrive.
      setStreamError(requestId, err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <MessageList />
      <ImagePreview />
      <MessageInput onSend={handleSend} />
    </div>
  )
}
