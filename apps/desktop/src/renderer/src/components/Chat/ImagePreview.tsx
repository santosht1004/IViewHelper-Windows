import { X } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

export function ImagePreview() {
  const screenshots = useChatStore(s => s.pendingScreenshots)
  const removeScreenshot = useChatStore(s => s.removeScreenshot)

  if (screenshots.length === 0) return null

  return (
    <div
      className="flex gap-2.5 px-4 py-3 overflow-x-auto"
      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
    >
      {screenshots.map((src, i) => (
        <div key={i} className="relative shrink-0 group">
          <img
            src={src}
            alt={`Screenshot ${i + 1}`}
            className="h-20 rounded-lg"
            style={{ border: '1px solid var(--border)' }}
          />
          <button
            onClick={() => removeScreenshot(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'var(--danger)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
          >
            <X size={10} color="#fff" />
          </button>
        </div>
      ))}
    </div>
  )
}
