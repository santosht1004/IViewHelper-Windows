import { useSettingsStore } from '../../stores/settingsStore'
import { modelSupportsReasoning, type ReasoningEffort } from '../../lib/types'

const EFFORTS: { value: ReasoningEffort; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

export function ReasoningSelector() {
  const model = useSettingsStore(s => s.model)
  const reasoningEffort = useSettingsStore(s => s.reasoningEffort)
  const setReasoningEffort = useSettingsStore(s => s.setReasoningEffort)

  const supported = modelSupportsReasoning(model)

  return (
    <select
      value={reasoningEffort}
      onChange={e => setReasoningEffort(e.target.value as ReasoningEffort)}
      disabled={!supported}
      title={supported ? 'Reasoning effort' : 'Selected model does not support reasoning'}
      className="text-xs px-2 py-1.5 rounded-lg cursor-pointer outline-none disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)'
      }}
    >
      {EFFORTS.map(e => (
        <option key={e.value} value={e.value}>
          {e.label}
        </option>
      ))}
    </select>
  )
}
