import { useEffect, useCallback, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { LockScreen } from './components/LockScreen'
import { ControlBar } from './components/Controls/ControlBar'
import { ChatPanel } from './components/Chat/ChatPanel'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { useSettingsStore } from './stores/settingsStore'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useSpeechStore } from './stores/speechStore'
import { useChatStore } from './stores/chatStore'

export default function App() {
  const loadSettings = useSettingsStore(s => s.loadSettings)
  const loaded = useSettingsStore(s => s.loaded)
  const [unlocked, setUnlocked] = useState(false)

  // Settings live behind the launch password; only load them once unlocked.
  useEffect(() => {
    if (unlocked) loadSettings()
  }, [unlocked, loadSettings])

  const handleTranscript = useCallback((text: string) => {
    window.dispatchEvent(new CustomEvent('speech-transcript', { detail: text }))
  }, [])

  const { startListening, stopListening } = useSpeechRecognition(handleTranscript)

  const handleMicToggle = useCallback((listening: boolean) => {
    if (listening) {
      startListening()
    } else {
      stopListening()
    }
  }, [startListening, stopListening])

  // Global keyboard shortcuts from main process
  useEffect(() => {
    if (!unlocked) return
    const unsubMic = window.electronAPI.onToggleMic(() => {
      const isListening = useSpeechStore.getState().isListening
      handleMicToggle(!isListening)
    })

    const unsubScreenshot = window.electronAPI.onScreenshotShortcut(async () => {
      try {
        const base64 = await window.electronAPI.captureScreenshot()
        useChatStore.getState().addScreenshot(base64)
        window.dispatchEvent(new Event('focus-message-input'))
      } catch (err) {
        console.error('Screenshot shortcut failed:', err)
      }
    })

    const unsubClear = window.electronAPI.onClearChat(() => {
      useChatStore.getState().clearChat()
    })

    return () => {
      unsubMic()
      unsubScreenshot()
      unsubClear()
    }
  }, [unlocked, handleMicToggle])

  if (!unlocked) {
    return <LockScreen onUnlocked={() => setUnlocked(true)} />
  }

  if (!loaded) {
    return (
      <div
        className="h-full flex items-center justify-center rounded-xl"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-2">
      <div className="h-full flex flex-col rounded-2xl overflow-hidden relative"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <TitleBar />
        <ControlBar onMicToggle={handleMicToggle} />
        <ChatPanel />
        <SettingsPanel />
      </div>
    </div>
  )
}
