import { Mic, MicOff } from 'lucide-react'
import { useSpeechStore } from '../../stores/speechStore'

interface Props {
  onToggle: (listening: boolean) => void
}

export function MicToggle({ onToggle }: Props) {
  const isListening = useSpeechStore(s => s.isListening)

  return (
    <button
      onClick={() => onToggle(!isListening)}
      className={`relative p-2 rounded-lg transition-all ${isListening ? 'mic-active' : ''}`}
      style={{
        background: isListening ? 'rgba(239,68,68,0.15)' : 'var(--bg-tertiary)',
        border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`
      }}
      title={isListening ? 'Stop listening' : 'Start listening'}
    >
      {isListening ? (
        <>
          <Mic size={15} style={{ color: 'var(--danger)' }} />
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{ background: 'var(--danger)' }}
          />
        </>
      ) : (
        <MicOff size={15} style={{ color: 'var(--text-muted)' }} />
      )}
    </button>
  )
}
