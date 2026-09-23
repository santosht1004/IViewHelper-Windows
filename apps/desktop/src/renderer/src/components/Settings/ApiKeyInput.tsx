import { useState } from 'react'
import { Eye, EyeOff, Key } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import type { Provider } from '../../lib/types'

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  groq: 'Groq',
  gemini: 'Google Gemini',
  alibaba: 'Alibaba Model Studio'
}

// Keys are write-only: the saved key stays in the main process, so this field only
// accepts a new key and shows whether one is already stored.
export function ApiKeyInput() {
  const provider = useSettingsStore(s => s.provider)
  const hasApiKey = useSettingsStore(s => s.hasApiKey[s.provider])
  const keyStorageEncrypted = useSettingsStore(s => s.keyStorageEncrypted)
  const setApiKey = useSettingsStore(s => s.setApiKey)
  const [draft, setDraft] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerLabel = PROVIDER_LABELS[provider]
  const examplePrefix = provider === 'groq' ? 'gsk_...' : provider === 'gemini' ? 'AIzaSy...' : 'sk-...'

  const save = async (key: string) => {
    setBusy(true)
    setError(null)
    try {
      await setApiKey(key)
      setDraft('')
    } catch {
      setError('Could not save API key.')
    } finally {
      setBusy(false)
    }
  }

  const buttonStyle = { background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
        <Key size={12} />
        {providerLabel} API Key
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type={visible ? 'text' : 'password'}
          value={draft}
          disabled={busy}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) save(draft) }}
          placeholder={hasApiKey ? '•••••••• saved — enter a new key to replace' : examplePrefix}
          autoComplete="off"
          className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500/50"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)'
          }}
        />
        <button
          onClick={() => setVisible(!visible)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={buttonStyle}
          title={visible ? 'Hide' : 'Show'}
        >
          {visible ? <EyeOff size={13} color="var(--text-muted)" /> : <Eye size={13} color="var(--text-muted)" />}
        </button>
        {draft.trim() ? (
          <button
            onClick={() => save(draft)}
            disabled={busy}
            className="text-xs px-2.5 py-2 rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Save
          </button>
        ) : hasApiKey ? (
          <button
            onClick={() => save('')}
            disabled={busy}
            className="text-xs px-2.5 py-2 rounded-lg hover:bg-red-500/15 transition-colors disabled:opacity-30"
            style={{ ...buttonStyle, color: 'var(--danger)' }}
          >
            Remove
          </button>
        ) : null}
      </div>
      {provider === 'alibaba' && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Use a key created in the region selected below.
        </p>
      )}
      {error && <p className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>{error}</p>}
      {hasApiKey && !keyStorageEncrypted && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--warning)' }}>
          OS encryption is unavailable, so this key is stored unencrypted on disk.
        </p>
      )}
    </div>
  )
}
