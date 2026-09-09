import { useSettingsStore } from '../../stores/settingsStore'
import type { Provider } from '../../lib/types'

const MODELS: Record<Provider, Array<{ id: string; name: string }>> = {
  openai: [
    { id: 'gpt-5.4', name: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    { id: 'gpt-5.3', name: 'GPT-5.3' },
    { id: 'gpt-5.2', name: 'GPT-5.2' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o4-mini', name: 'o4 Mini' },
    { id: 'o3', name: 'o3' },
    { id: 'o3-mini', name: 'o3 Mini' },
    { id: 'o3-pro', name: 'o3 Pro' },
    { id: 'o1', name: 'o1' },
  ],
  groq: [
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B (Vision)' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Vision)' },
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
  ]
}

export function ModelSelector() {
  const model = useSettingsStore(s => s.model)
  const setModel = useSettingsStore(s => s.setModel)
  const provider = useSettingsStore(s => s.provider)

  const models = MODELS[provider] || MODELS.openai
  const validModel = models.some(m => m.id === model) ? model : models[0].id

  if (validModel !== model) {
    setModel(validModel)
  }

  return (
    <select
      value={validModel}
      onChange={e => setModel(e.target.value)}
      className="text-xs px-2 py-1.5 rounded-lg cursor-pointer outline-none"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)'
      }}
    >
      {models.map(m => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
  )
}
