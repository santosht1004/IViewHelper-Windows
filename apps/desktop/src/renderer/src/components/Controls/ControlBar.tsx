import { MicToggle } from './MicToggle'
import { ScreenshotButton } from './ScreenshotButton'
import { OpacitySlider } from './OpacitySlider'
import { ModelSelector } from './ModelSelector'
import { ReasoningSelector } from './ReasoningSelector'
import { useSettingsStore } from '../../stores/settingsStore'
import { Trash2 } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

interface Props {
  onMicToggle: (listening: boolean) => void
}

export function ControlBar({ onMicToggle }: Props) {
  const systemPrompts = useSettingsStore(s => s.systemPrompts)
  const activeSystemPromptId = useSettingsStore(s => s.activeSystemPromptId)
  const setActiveSystemPromptId = useSettingsStore(s => s.setActiveSystemPromptId)
  const clearChat = useChatStore(s => s.clearChat)

  return (
    <div
      className="flex flex-col gap-2.5 px-4 py-3"
      style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Top row: prompt selector + model */}
      <div className="flex items-center gap-2">
        <select
          value={activeSystemPromptId || ''}
          onChange={e => setActiveSystemPromptId(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg cursor-pointer outline-none truncate"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)'
          }}
        >
          {systemPrompts.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ModelSelector />
        <ReasoningSelector />
      </div>

      {/* Bottom row: controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MicToggle onToggle={onMicToggle} />
          <ScreenshotButton />
          <button
            onClick={clearChat}
            className="p-2 rounded-lg transition-all hover:bg-white/5"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            title="Clear chat"
          >
            <Trash2 size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <OpacitySlider />
      </div>
    </div>
  )
}
