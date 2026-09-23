import type { Message } from '../../lib/types'
import { MarkdownRenderer } from './MarkdownRenderer'
import { User, Bot } from 'lucide-react'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 px-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
            : 'linear-gradient(135deg, #1e293b, #334155)',
          boxShadow: isUser
            ? '0 2px 8px rgba(79,70,229,0.3)'
            : '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        {isUser ? <User size={13} color="#fff" /> : <Bot size={13} color="#94a3b8" />}
      </div>

      <div
        className="max-w-[85%] overflow-hidden"
        style={{
          padding: '12px 16px',
          minWidth: 0,
          background: isUser
            ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
            : 'var(--bg-bubble-assistant)',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: isUser
            ? '0 2px 12px rgba(79,70,229,0.2)'
            : '0 1px 4px rgba(0,0,0,0.1)'
        }}
      >
        {/* Screenshots */}
        {message.screenshots.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.screenshots.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Screenshot ${i + 1}`}
                className="rounded-lg max-h-36 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ))}
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <p className="whitespace-pre-wrap" style={{ color: '#fff' }}>{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  )
}
