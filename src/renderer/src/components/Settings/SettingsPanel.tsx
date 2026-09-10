import { useRef } from 'react'
import { X, AlertTriangle, Type, Server } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { ApiKeyInput } from './ApiKeyInput'
import { SystemPromptEditor, type SystemPromptEditorHandle } from './SystemPromptEditor'
import { SystemPromptList } from './SystemPromptList'

const FONT_SIZES = [
  { value: 12, label: 'Small' },
  { value: 14, label: 'Medium' },
  { value: 16, label: 'Large' },
  { value: 18, label: 'X-Large' }
]

export function SettingsPanel() {
  const showSettings = useSettingsStore(s => s.showSettings)
  const setShowSettings = useSettingsStore(s => s.setShowSettings)
  const fontSize = useSettingsStore(s => s.fontSize)
  const setFontSize = useSettingsStore(s => s.setFontSize)
  const provider = useSettingsStore(s => s.provider)
  const setProvider = useSettingsStore(s => s.setProvider)
  const editorRef = useRef<SystemPromptEditorHandle>(null)

  const PROVIDERS = [
    { value: 'openai' as const, label: 'OpenAI' },
    { value: 'groq' as const, label: 'Groq' },
    { value: 'gemini' as const, label: 'Gemini' }
  ]

  if (!showSettings) return null

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)'
        }}
      >
        <span className="text-sm font-semibold">Settings</span>
        <button
          onClick={() => setShowSettings(false)}
          className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-5 p-5 overflow-y-auto flex-1">
        {/* Provider */}
        <div>
          <label className="flex items-center gap-1.5 text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Server size={12} />
            Provider
          </label>
          <div className="flex gap-1.5">
            {PROVIDERS.map(p => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className="flex-1 text-xs py-1.5 rounded-lg transition-all"
                style={{
                  background: provider === p.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: provider === p.value ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${provider === p.value ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: provider === p.value ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <ApiKeyInput />

        {/* Font Size */}
        <div>
          <label className="flex items-center gap-1.5 text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Type size={12} />
            Font Size
          </label>
          <div className="flex gap-1.5">
            {FONT_SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => setFontSize(s.value)}
                className="flex-1 text-xs py-1.5 rounded-lg transition-all"
                style={{
                  background: fontSize === s.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: fontSize === s.value ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${fontSize === s.value ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: fontSize === s.value ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <SystemPromptList onEdit={(prompt) => editorRef.current?.edit(prompt)} />
        <SystemPromptEditor ref={editorRef} />

        {/* macOS Warning */}
        <div
          className="flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed"
          style={{
            background: 'rgba(234,179,8,0.06)',
            border: '1px solid rgba(234,179,8,0.15)'
          }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <div style={{ color: 'rgba(234,179,8,0.8)' }}>
            <strong>macOS 15+:</strong> Window may be visible in Zoom, OBS, and QuickTime.
            Use opacity slider + Cmd+Shift+H for manual stealth.
            Works fine with Google Meet and Teams.
          </div>
        </div>

        {/* Shortcuts */}
        <div>
          <label className="block text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Keyboard Shortcuts
          </label>
          <div className="text-xs space-y-2" style={{ color: 'var(--text-primary)' }}>
            {[
              ['Show/Hide', `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+H`],
              ['Toggle Mic', `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+M`],
              ['Screenshot', `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+S`],
              ['Clear Chat', `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+R`],
              ['Send message', 'Enter'],
              ['New line', 'Shift+Enter']
            ].map(([label, key]) => (
              <div key={label} className="flex justify-between items-center">
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <kbd
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                >
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
