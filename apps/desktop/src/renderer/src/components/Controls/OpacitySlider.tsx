import { Eye } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

export function OpacitySlider() {
  const opacity = useSettingsStore(s => s.opacity)
  const setOpacity = useSettingsStore(s => s.setOpacity)

  return (
    <div className="flex items-center gap-2">
      <Eye size={13} style={{ color: 'var(--text-muted)' }} />
      <input
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        value={opacity}
        onChange={e => setOpacity(parseFloat(e.target.value))}
        className="w-16 h-1 rounded-full cursor-pointer accent-indigo-500"
        title={`Opacity: ${Math.round(opacity * 100)}%`}
      />
      <span className="text-[10px] w-7 text-right" style={{ color: 'var(--text-muted)' }}>
        {Math.round(opacity * 100)}%
      </span>
    </div>
  )
}
