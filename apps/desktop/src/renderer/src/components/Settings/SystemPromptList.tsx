import { Trash2, Pencil } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

interface Props {
  onEdit?: (prompt: { id: string; name: string; content: string }) => void
}

export function SystemPromptList({ onEdit }: Props) {
  const systemPrompts = useSettingsStore(s => s.systemPrompts)
  const deleteSystemPrompt = useSettingsStore(s => s.deleteSystemPrompt)

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        System Prompts
      </label>
      {systemPrompts.map(p => (
        <div
          key={p.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs group"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>
            {p.name}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit({ id: p.id, name: p.name, content: p.content })}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Edit"
              >
                <Pencil size={11} style={{ color: 'var(--accent)' }} />
              </button>
            )}
            <button
              onClick={() => deleteSystemPrompt(p.id)}
              className="p-1 rounded hover:bg-red-500/20 transition-colors"
              title="Delete"
            >
              <Trash2 size={11} style={{ color: 'var(--danger)' }} />
            </button>
          </div>
        </div>
      ))}
      {systemPrompts.length === 0 && (
        <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>
          No prompts. Create one below.
        </p>
      )}
    </div>
  )
}
