import type { ChatMessagePayload, ContentPart, Message } from './types'
import { useChatStore } from '../stores/chatStore'
import { useSettingsStore } from '../stores/settingsStore'
import { streamOpenAIChat } from '../api/openai'
import { streamGeminiChat } from '../api/gemini'

function toPayload(content: string, images: string[]): string | ContentPart[] {
  if (images.length === 0) return content
  const parts: ContentPart[] = images.map(url => ({ type: 'image_url', image_url: { url } }))
  if (content) parts.unshift({ type: 'text', text: content })
  return parts
}

function messageToPayload(m: Message): ChatMessagePayload {
  return { role: m.role, content: toPayload(m.content, m.images) }
}

export async function sendChatMessage(content: string, images: string[], apiKey: string): Promise<void> {
  const chat = useChatStore.getState()
  const settings = useSettingsStore.getState()

  const priorMessages = chat.messages
  chat.addUserMessage(content, images)

  const history: ChatMessagePayload[] = [
    ...priorMessages.map(messageToPayload),
    { role: 'user', content: toPayload(content, images) }
  ]

  const request = {
    messages: history,
    model: settings.model,
    systemPrompt: settings.systemPrompt,
    provider: settings.provider,
    reasoningEffort: settings.reasoningEffort
  }

  const { requestId, signal } = chat.startStream()

  try {
    const generator =
      settings.provider === 'gemini' ? streamGeminiChat(request, apiKey, signal) : streamOpenAIChat(request, apiKey, signal)

    for await (const chunk of generator) {
      chat.appendStreamChunk(requestId, chunk)
    }
    chat.finalizeStream(requestId)
  } catch (err) {
    if (signal.aborted) return
    chat.setStreamError(requestId, err instanceof Error ? err.message : 'Unknown error')
  }
}
