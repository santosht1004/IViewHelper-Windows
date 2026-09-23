import { create } from 'zustand'

interface SpeechState {
  isListening: boolean
  interimTranscript: string
  error: string | null

  setListening: (val: boolean) => void
  setInterimTranscript: (text: string) => void
  setError: (err: string | null) => void
}

export const useSpeechStore = create<SpeechState>((set) => ({
  isListening: false,
  interimTranscript: '',
  error: null,

  setListening: (val) => set({ isListening: val }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  setError: (err) => set({ error: err })
}))
