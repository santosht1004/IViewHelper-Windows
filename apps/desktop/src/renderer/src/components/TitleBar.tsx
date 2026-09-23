import { Minus, X, Settings } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'

export function TitleBar() {
  const setShowSettings = useSettingsStore(s => s.setShowSettings)
  const showSettings = useSettingsStore(s => s.showSettings)

  return (
    <div
      className="flex items-center justify-between px-4 py-3 select-none"
      style={{
        WebkitAppRegion: 'drag',
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

      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded-md transition-colors hover:bg-white/8"
          title="Settings"
        >
          <Settings size={13} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button
          onClick={() => window.electronAPI.minimize()}
          className="p-1.5 rounded-md transition-colors hover:bg-white/8"
          title="Hide (Cmd+Shift+H)"
        >
          <Minus size={13} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button
          onClick={() => window.electronAPI.close()}
          className="p-1.5 rounded-md transition-colors hover:bg-red-500/15"
          title="Quit"
        >
          <X size={13} style={{ color: 'var(--danger)' }} />
        </button>
      </div>
    </div>
  )
}
