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
    { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision (Free)' },
    { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision (Free)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B' },
    { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B SpecDec' },
    { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  ],
  gemini: [
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-pro-latest', name: 'Gemini Pro Latest' },
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
