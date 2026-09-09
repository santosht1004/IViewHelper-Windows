import { useState } from 'react'
import { Eye, EyeOff, Key } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

export function ApiKeyInput() {
  const apiKey = useSettingsStore(s => s.apiKey)
  const provider = useSettingsStore(s => s.provider)
  const setApiKey = useSettingsStore(s => s.setApiKey)
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
        <Key size={12} />
        {provider === 'groq' ? 'Groq' : 'OpenAI'} API Key
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type={visible ? 'text' : 'password'}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={provider === 'groq' ? 'gsk_...' : 'sk-...'}
          className="flex-1 text-xs px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500/50"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)'
          }}
        />
        <button
          onClick={() => setVisible(!visible)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          {visible ? <EyeOff size={13} color="var(--text-muted)" /> : <Eye size={13} color="var(--text-muted)" />}
        </button>
      </div>
    </div>
  )
}
