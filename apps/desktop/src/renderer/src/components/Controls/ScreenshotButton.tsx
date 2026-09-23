import { Camera, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useChatStore } from '../../stores/chatStore'

export function ScreenshotButton() {
  const [capturing, setCapturing] = useState(false)
  const addScreenshot = useChatStore(s => s.addScreenshot)

  const handleCapture = async () => {
    setCapturing(true)
    try {
      const base64 = await window.electronAPI.captureScreenshot()
      addScreenshot(base64)
      window.dispatchEvent(new Event('focus-message-input'))
    } catch (err) {
      console.error('Screenshot failed:', err)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <button
      onClick={handleCapture}
      disabled={capturing}
      className="p-2 rounded-lg transition-all hover:bg-white/5"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      title="Take screenshot"
    >
      {capturing ? (
        <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent)' }} />
      ) : (
        <Camera size={15} style={{ color: 'var(--text-muted)' }} />
      )}
    </button>
  )
}
