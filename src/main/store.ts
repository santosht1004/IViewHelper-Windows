import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type { AlibabaRegion, Provider, ReasoningEffort, STTProvider, SystemPrompt } from '../shared/ipc'
import { INITIAL_LOCKOUT_STATE, type LockoutState } from './lockout'

interface StoreSchema {
  // Legacy plaintext keys; migrated into secureApiKeys by migrateLegacyApiKeys().
  apiKey?: string
  apiKeys?: Record<string, string>
  // Values are "enc:<base64>" (safeStorage) or "plain:<key>" when OS encryption is unavailable.
  secureApiKeys: Partial<Record<Provider, string>>
  provider: Provider
  alibabaRegion: AlibabaRegion
  model: string
  opacity: number
  fontSize: number
  sttProvider: STTProvider
  reasoningEffort: ReasoningEffort
  activeSystemPromptId: string | null
  systemPrompts: SystemPrompt[]
  windowBounds: { x: number; y: number; width: number; height: number } | null
  authState: LockoutState
}

const defaultPrompts: SystemPrompt[] = [
  {
    id: 'default-general',
    name: 'General Assistant',
    content: 'You are a helpful assistant. Provide clear, concise answers. When analyzing screenshots, describe what you see and provide relevant insights.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'default-technical',
    name: 'DSA Interview Coach',
    content: `You are an expert DSA interview coach helping the user during a live coding interview.

The user may share a screenshot or text of a DSA problem from CodeSignal, LeetCode, or a similar platform. First, understand the problem clearly.

Respond in this exact structure:

## Problem Understanding
- Restate the problem in plain English (1-2 sentences).
- Inputs, outputs, constraints.
- Key observations or tricky parts.

## Code
- Always Python.
- Clean, interview-ready, easy to read.
- Clear variable names.
- Add comments explaining each key step so the user can talk through it with the interviewer.

## Complexity
- Time and space complexity, one line each.

## Why This Approach
- 1-2 sentences on why this is the best tradeoff for an interview setting.

Rules:
- Be precise and concise. No filler.
- Prefer simple readable code over clever one-liners.
- If multiple patterns apply (sliding window, two pointers, etc.), mention the best one and why.
- If a screenshot is unclear, say what is uncertain instead of guessing.
- Never give hints-only — always give the full working solution with comments.`,
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'default-meeting',
    name: 'Meeting Notes',
    content: 'You are a meeting assistant. Summarize discussion points, identify action items, and highlight key decisions. When shown screenshots, extract relevant information and organize it clearly.',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
]

export const store = new Store<StoreSchema>({
  defaults: {
    secureApiKeys: {},
    provider: 'openai',
    alibabaRegion: 'singapore',
    model: 'gpt-5.4',
    opacity: 0.95,
    fontSize: 14,
    sttProvider: 'whisper',
    reasoningEffort: 'medium',
    activeSystemPromptId: 'default-general',
    systemPrompts: defaultPrompts,
    windowBounds: null,
    authState: INITIAL_LOCKOUT_STATE
  }
})

// Migrate legacy webspeech setting (Web Speech API doesn't work in Electron —
// it requires a Google API key only Chrome ships with)
if ((store.get('sttProvider') as string) !== 'whisper') {
  store.set('sttProvider', 'whisper')
}

export function getSystemPrompts(): SystemPrompt[] {
  return store.get('systemPrompts', defaultPrompts)
}

export function saveSystemPrompt(prompt: { id?: string; name: string; content: string }): SystemPrompt {
  const prompts = getSystemPrompts()
  const now = Date.now()

  if (prompt.id) {
    // Update existing (including defaults)
    const index = prompts.findIndex(p => p.id === prompt.id)
    if (index >= 0) {
      prompts[index] = { ...prompts[index], name: prompt.name, content: prompt.content, updatedAt: now }
      store.set('systemPrompts', prompts)
      return prompts[index]
    }
  }

  // Create new
  const newPrompt: SystemPrompt = {
    id: randomUUID(),
    name: prompt.name,
    content: prompt.content,
    isDefault: false,
    createdAt: now,
    updatedAt: now
  }
  prompts.push(newPrompt)
  store.set('systemPrompts', prompts)
  return newPrompt
}

export function deleteSystemPrompt(id: string): boolean {
  const prompts = getSystemPrompts()
  const filtered = prompts.filter(p => p.id !== id)
  if (filtered.length === prompts.length) return false

  store.set('systemPrompts', filtered)

  // Reset active prompt if deleted
  if (store.get('activeSystemPromptId') === id) {
    const first = filtered[0]
    store.set('activeSystemPromptId', first ? first.id : null)
  }
  return true
}
