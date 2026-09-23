import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSpeechStore } from '../../stores/speechStore'

interface Props {
  onSend: (content: string, screenshots: string[]) => void
}

export function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const textRef = useRef(text)
  textRef.current = text
  const isStreaming = useChatStore(s => s.isStreaming)
  const pendingScreenshots = useChatStore(s => s.pendingScreenshots)
  const clearScreenshots = useChatStore(s => s.clearScreenshots)
  const hasApiKey = useSettingsStore(s => s.hasApiKey[s.provider])
  const interimTranscript = useSpeechStore(s => s.interimTranscript)
  const speechError = useSpeechStore(s => s.error)

  // Listen for speech transcripts from useSpeechRecognition
  useEffect(() => {
    const handler = (e: Event) => {
      const transcript = (e as CustomEvent<string>).detail
      setText(prev => {
        const separator = prev ? '\n' : ''
        return prev + separator + transcript
      })
    }
    window.addEventListener('speech-transcript', handler)
    return () => window.removeEventListener('speech-transcript', handler)
  }, [])

  // Global Enter to send (when textarea not focused). Reads the latest handleSend through a
  // ref so the listener never acts on stale text, API-key state, or onSend.
  const handleSendRef = useRef<() => void>(() => {})
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement !== textareaRef.current) {
        const hasText = textRef.current.trim().length > 0
        const screenshots = useChatStore.getState().pendingScreenshots
        if (hasText || screenshots.length > 0) {
          e.preventDefault()
          handleSendRef.current()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Cmd+Shift+Delete from main process to clear input
  useEffect(() => {
    const unsub = window.electronAPI.onClearInput(() => {
      setText('')
      clearScreenshots()
    })
    return unsub
  }, [clearScreenshots])

  // Cmd+Shift+E to focus input
  useEffect(() => {
    const unsub = window.electronAPI.onFocusInput(() => {
      textareaRef.current?.focus()
    })
    return unsub
  }, [])

  // Focus input after screenshot
  useEffect(() => {
    const handler = () => textareaRef.current?.focus()
    window.addEventListener('focus-message-input', handler)
    return () => window.removeEventListener('focus-message-input', handler)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    }
  }, [text])

  const handleSend = () => {
    const content = text.trim()
    const screenshots = useChatStore.getState().pendingScreenshots
    if (!content && screenshots.length === 0) return
    if (!hasApiKey) {
      useSettingsStore.getState().setShowSettings(true)
      return
    }
    onSend(content, [...screenshots])
    setText('')
    clearScreenshots()
  }
  handleSendRef.current = handleSend

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="px-4 py-3.5"
      style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
    >
      {/* Speech error or interim transcript status */}
      {speechError && (
        <div
          className="text-xs mb-2 px-2.5 py-1.5 rounded-lg flex items-center justify-between"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span>⚠️ {speechError}</span>
        </div>
      )}

      {interimTranscript && !speechError && (
        <div
          className="text-xs mb-2 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse"
          style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}
        >
          <span>{interimTranscript}</span>
        </div>
      )}

      <div
        className="flex items-end gap-2.5 rounded-xl px-3.5 py-2.5"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasApiKey ? 'Type a message...' : 'Set API key in settings first'}
          disabled={isStreaming}
          rows={2}
          className="flex-1 bg-transparent resize-none outline-none placeholder:opacity-30"
          style={{ color: 'var(--text-primary)', maxHeight: '160px', minHeight: '48px', fontSize: 'inherit' }}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || (!text.trim() && pendingScreenshots.length === 0)}
          className="shrink-0 p-2 rounded-lg transition-all disabled:opacity-20"
          style={{
            background: 'var(--accent)',
            boxShadow: (!isStreaming && (text.trim() || pendingScreenshots.length > 0))
              ? '0 2px 8px rgba(99,102,241,0.3)'
              : 'none'
          }}
          title="Send (Enter)"
        >
          <Send size={15} color="#fff" />
        </button>
      </div>
    </div>
  )
}
