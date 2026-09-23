import { useEffect, useRef } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ChatSearchBar } from './ChatSearchBar'
import { Bot, Loader2, MessageSquare } from 'lucide-react'

export function MessageList() {
  const messages = useChatStore(s => s.messages)
  const isStreaming = useChatStore(s => s.isStreaming)
  const streamingContent = useChatStore(s => s.streamingContent)
  const error = useChatStore(s => s.error)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  // Track whether the user is near the bottom; if they scrolled up, stop auto-scrolling
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = distanceFromBottom < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Smooth scroll when a new message is finalized
  useEffect(() => {
    if (!stickToBottomRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Instant scroll on every stream chunk (smooth would stack animations and glitch)
  useEffect(() => {
    if (!stickToBottomRef.current) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [streamingContent])

  // Global scroll shortcuts
  useEffect(() => {
    const unsub = window.electronAPI.onScroll((direction) => {
      if (!scrollRef.current) return
      const amount = 200
      scrollRef.current.scrollBy({
        top: direction === 'up' ? -amount : amount,
        behavior: 'smooth'
      })
    })
    return unsub
  }, [])

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <ChatSearchBar containerRef={scrollRef} />
      <div ref={scrollRef} className="h-full overflow-y-auto py-5 px-3">
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--accent-glow)',
              border: '1px solid var(--border-accent)'
            }}
          >
            <MessageSquare size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Start a conversation
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Type, speak, or take a screenshot
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Streaming response */}
      {isStreaming && (
        <div className="flex gap-3 px-2 mt-4">
          <div
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
            style={{
              background: 'linear-gradient(135deg, #1e293b, #334155)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <Bot size={13} color="#94a3b8" />
          </div>
          <div
            className="max-w-[85%]"
            style={{
              padding: '12px 16px',
              background: 'var(--bg-bubble-assistant)',
              borderRadius: '16px 16px 16px 4px',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
            }}
          >
            {streamingContent ? (
              <MarkdownRenderer content={streamingContent} />
            ) : (
              <div className="flex items-center gap-2 py-1">
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mx-2 mt-4 p-3 rounded-xl text-xs flex items-start gap-2"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--danger)'
          }}
        >
          {error}
        </div>
      )}

      <div ref={bottomRef} />
      </div>
    </div>
  )
}
