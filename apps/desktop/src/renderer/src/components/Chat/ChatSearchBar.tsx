import { useEffect, useRef, useState, useCallback, RefObject } from 'react'
import { ChevronUp, ChevronDown, X, Search } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

interface Props {
  containerRef: RefObject<HTMLDivElement | null>
}

const MARK_CLASS = 'chat-find-mark'
const MARK_CURRENT_CLASS = 'chat-find-mark-current'

export function ChatSearchBar({ containerRef }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<HTMLElement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const messages = useChatStore(s => s.messages)
  const streamingContent = useChatStore(s => s.streamingContent)

  // Listen for Cmd+Shift+F from main process
  useEffect(() => {
    const unsub = window.electronAPI.onFindInChat(() => {
      setOpen(prev => {
        const next = !prev
        if (next) {
          requestAnimationFrame(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
          })
        }
        return next
      })
    })
    return unsub
  }, [])

  // Remove all our highlight marks from the container
  const clearMarks = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const marks = container.querySelectorAll(`mark.${MARK_CLASS}`)
    marks.forEach(mark => {
      const parent = mark.parentNode
      if (!parent) return
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
      parent.removeChild(mark)
      parent.normalize()
    })
  }, [containerRef])

  // Walk text nodes and wrap matches in <mark>
  const highlightMatches = useCallback(
    (searchQuery: string): HTMLElement[] => {
      clearMarks()
      const container = containerRef.current
      if (!container || !searchQuery) return []

      const queryLower = searchQuery.toLowerCase()
      const queryLen = searchQuery.length
      const found: HTMLElement[] = []

      // Collect text nodes first; mutating during walk invalidates the walker
      const textNodes: Text[] = []
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.nodeValue) return NodeFilter.FILTER_REJECT
          const parent = node.parentNode as HTMLElement | null
          if (!parent) return NodeFilter.FILTER_REJECT
          const tag = parent.tagName
          if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT
          if (parent.classList?.contains(MARK_CLASS)) return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        }
      })
      let n: Node | null
      while ((n = walker.nextNode())) textNodes.push(n as Text)

      textNodes.forEach(textNode => {
        const text = textNode.nodeValue || ''
        const lower = text.toLowerCase()
        let idx = lower.indexOf(queryLower)
        if (idx === -1) return

        const parent = textNode.parentNode
        if (!parent) return

        const frag = document.createDocumentFragment()
        let lastIdx = 0
        while (idx !== -1) {
          if (idx > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)))
          }
          const mark = document.createElement('mark')
          mark.className = MARK_CLASS
          mark.textContent = text.slice(idx, idx + queryLen)
          frag.appendChild(mark)
          found.push(mark)
          lastIdx = idx + queryLen
          idx = lower.indexOf(queryLower, lastIdx)
        }
        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)))
        }
        parent.replaceChild(frag, textNode)
      })

      return found
    },
    [containerRef, clearMarks]
  )

  // Re-run highlighting when query, messages, or stream content changes
  useEffect(() => {
    if (!open) {
      clearMarks()
      setMatches([])
      setCurrentIndex(0)
      return
    }
    const found = highlightMatches(query)
    setMatches(found)
    setCurrentIndex(prev => {
      if (found.length === 0) return 0
      return Math.min(prev, found.length - 1)
    })
  }, [open, query, messages, streamingContent, highlightMatches, clearMarks])

  // Mark the active match and scroll it into view
  useEffect(() => {
    matches.forEach((m, i) => {
      if (i === currentIndex) m.classList.add(MARK_CURRENT_CLASS)
      else m.classList.remove(MARK_CURRENT_CLASS)
    })
    const current = matches[currentIndex]
    if (current) {
      current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [matches, currentIndex])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearMarks()
  }, [clearMarks])

  const goNext = () => {
    if (matches.length === 0) return
    setCurrentIndex((currentIndex + 1) % matches.length)
  }

  const goPrev = () => {
    if (matches.length === 0) return
    setCurrentIndex((currentIndex - 1 + matches.length) % matches.length)
  }

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) goPrev()
      else goNext()
    }
  }

  if (!open) return null

  return (
    <div
      className="absolute top-2 right-3 z-50 flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
      }}
    >
      <Search size={13} style={{ color: 'var(--text-muted)' }} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in chat"
        className="bg-transparent outline-none text-xs w-32"
        style={{ color: 'var(--text-primary)' }}
      />
      <span
        className="text-xs tabular-nums px-1 min-w-[2.5rem] text-center"
        style={{
          color: query && matches.length === 0 ? 'var(--danger)' : 'var(--text-muted)'
        }}
      >
        {matches.length === 0 ? (query ? '0/0' : '0/0') : `${currentIndex + 1}/${matches.length}`}
      </span>
      <button
        onClick={goPrev}
        disabled={matches.length === 0}
        className="p-1 rounded hover:bg-white/5 disabled:opacity-30"
        title="Previous (Shift+Enter)"
      >
        <ChevronUp size={13} style={{ color: 'var(--text-secondary)' }} />
      </button>
      <button
        onClick={goNext}
        disabled={matches.length === 0}
        className="p-1 rounded hover:bg-white/5 disabled:opacity-30"
        title="Next (Enter)"
      >
        <ChevronDown size={13} style={{ color: 'var(--text-secondary)' }} />
      </button>
      <button
        onClick={close}
        className="p-1 rounded hover:bg-white/5"
        title="Close (Esc)"
      >
        <X size={13} style={{ color: 'var(--text-secondary)' }} />
      </button>
    </div>
  )
}
