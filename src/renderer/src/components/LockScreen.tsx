import { useState, useRef, useEffect } from 'react'
import { Lock, Eye, EyeOff, X } from 'lucide-react'

interface Props {
  onUnlocked: () => void
}

export function LockScreen({ onUnlocked }: Props) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async () => {
    if (busy || !password) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.electronAPI.verifyPassword(password)
      if (result.ok) {
        onUnlocked()
        return
      }
      setPassword('')
      setError(
        result.remaining > 0
          ? `Incorrect password. ${result.remaining} attempt${result.remaining === 1 ? '' : 's'} left.`
          : 'Too many failed attempts. Closing.'
      )
      inputRef.current?.focus()
    } catch {
      setError('Could not verify password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full p-2">
      <div
        className="h-full flex flex-col rounded-2xl overflow-hidden relative"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      >
        {/* Drag region + quit */}
        <div
          className="flex items-center justify-between px-4 py-3 select-none"
          style={{
            WebkitAppRegion: 'drag' as unknown as string,
            background: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              iV
            </div>
            <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              iViewHelper
            </span>
          </div>
          <button
            onClick={() => window.electronAPI.close()}
            className="p-1.5 rounded-md transition-colors hover:bg-red-500/15"
            style={{ WebkitAppRegion: 'no-drag' as unknown as string }}
            title="Quit"
          >
            <X size={13} style={{ color: 'var(--danger)' }} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-accent)' }}
          >
            <Lock size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enter password</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>This app is locked</p>
          </div>

          <div className="w-full flex items-center gap-1.5">
            <input
              ref={inputRef}
              type={visible ? 'text' : 'password'}
              value={password}
              disabled={busy}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Password"
              autoComplete="off"
              className="flex-1 text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500/50"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <button
              onClick={() => setVisible(!visible)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              tabIndex={-1}
            >
              {visible ? <EyeOff size={14} color="var(--text-muted)" /> : <Eye size={14} color="var(--text-muted)" />}
            </button>
          </div>

          <button
            onClick={submit}
            disabled={busy || !password}
            className="w-full text-sm py-2 rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {busy ? 'Checking...' : 'Unlock'}
          </button>

          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
