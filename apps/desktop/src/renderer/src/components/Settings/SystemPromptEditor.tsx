import { useState, useImperativeHandle, forwardRef } from 'react'
import { Plus, Save } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

export interface SystemPromptEditorHandle {
  edit: (prompt: { id: string; name: string; content: string }) => void
}

export const SystemPromptEditor = forwardRef<SystemPromptEditorHandle>((_props, ref) => {
  const [editing, setEditing] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const saveSystemPrompt = useSettingsStore(s => s.saveSystemPrompt)

  useImperativeHandle(ref, () => ({
    edit: (prompt) => {
      setEditId(prompt.id)
      setName(prompt.name)
      setContent(prompt.content)
      setEditing(true)
    }
  }))

  const handleNew = () => {
    setEditId(undefined)
    setName('')
    setContent('')
    setEditing(true)
  }

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return
    await saveSystemPrompt({ id: editId, name: name.trim(), content: content.trim() })
    setEditing(false)
    setEditId(undefined)
    setName('')
    setContent('')
  }

  if (!editing) {
    return (
      <button
        onClick={handleNew}
        className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all hover:bg-indigo-500/15"
        style={{
          color: 'var(--accent)',
          border: '1px dashed var(--border-accent)',
          background: 'var(--accent-glow)'
        }}
      >
        <Plus size={13} /> New Prompt
      </button>
    )
  }

  return (
    <div
      className="flex flex-col gap-2.5 p-3 rounded-xl"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-accent)' }}
    >
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Prompt name"
        className="text-xs px-3 py-2 rounded-lg outline-none"
        style={{
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)'
        }}
        autoFocus
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="System prompt content..."
        rows={5}
        className="text-xs px-3 py-2 rounded-lg outline-none resize-none leading-relaxed"
        style={{
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)'
        }}
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => { setEditing(false); setEditId(undefined) }}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
          }}
        >
          <Save size={11} /> Save
        </button>
      </div>
    </div>
  )
})
