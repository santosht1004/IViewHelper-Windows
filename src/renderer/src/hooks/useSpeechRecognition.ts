import { useRef, useCallback, useEffect } from 'react'
import { useSpeechStore } from '../stores/speechStore'
import { useSettingsStore } from '../stores/settingsStore'

// Lower threshold to capture soft voices & speaker audio in live calls
const SPEECH_RMS_THRESHOLD = 0.003

export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shouldListenRef = useRef(false)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const streamRef = useRef<MediaStream | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const isTranscribingRef = useRef(false)

  const processAudioChunk = useCallback(async (blob: Blob) => {
    const { provider, hasApiKey } = useSettingsStore.getState()

    if (!hasApiKey[provider]) {
      useSpeechStore.getState().setError(`API key required for ${provider.toUpperCase()}`)
      useSpeechStore.getState().setInterimTranscript('')
      return
    }

    try {
      isTranscribingRef.current = true
      useSpeechStore.getState().setInterimTranscript('⚡ Transcribing...')
      const buffer = await blob.arrayBuffer()
      const transcript = await window.electronAPI.transcribeAudio(buffer, provider, blob.type || mimeTypeRef.current)

      if (transcript && transcript.trim()) {
        useSpeechStore.getState().setError(null)
        onTranscriptRef.current(transcript.trim())
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transcription failed'
      console.error('Speech transcription error:', err)
      useSpeechStore.getState().setError(errorMsg)
    } finally {
      isTranscribingRef.current = false
      if (shouldListenRef.current) {
        useSpeechStore.getState().setInterimTranscript('')
      }
    }
  }, [])

  const recordAndTranscribe = useCallback(() => {
    const stream = streamRef.current
    if (!stream || !shouldListenRef.current) return

    const mimeType = mimeTypeRef.current
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, { mimeType })
    } catch {
      recorder = new MediaRecorder(stream)
    }

    mediaRecorderRef.current = recorder
    const chunks: Blob[] = []

    const analyser = analyserRef.current
    const sampleBuffer = analyser ? new Float32Array(analyser.fftSize) : null
    let hasSpeech = false
    let lastSpeechTime = 0
    const chunkStartTime = Date.now()

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    recorder.onstop = () => {
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current)
        vadIntervalRef.current = null
      }

      // Immediately start next recording cycle so no speech is missed
      if (shouldListenRef.current) {
        recordAndTranscribe()
      }

      // Process finished chunk if speech was detected
      if (hasSpeech && chunks.length > 0) {
        const blob = new Blob(chunks, { type: mimeType })
        if (blob.size > 500) {
          processAudioChunk(blob)
        }
      }
    }

    // Monitor speech energy in real-time
    if (analyser && sampleBuffer) {
      vadIntervalRef.current = setInterval(() => {
        if (recorder.state !== 'recording') return

        analyser.getFloatTimeDomainData(sampleBuffer)
        let sum = 0
        for (let i = 0; i < sampleBuffer.length; i++) {
          sum += sampleBuffer[i] * sampleBuffer[i]
        }
        const rms = Math.sqrt(sum / sampleBuffer.length)
        const now = Date.now()
        const chunkDuration = now - chunkStartTime

        if (rms >= SPEECH_RMS_THRESHOLD) {
          hasSpeech = true
          lastSpeechTime = now
          if (!isTranscribingRef.current) {
            useSpeechStore.getState().setInterimTranscript('🎙️ Listening...')
          }
        }

        // Finalize chunk if user paused after speaking, or chunk reached max duration (7s)
        if (hasSpeech) {
          const silenceDuration = now - lastSpeechTime
          if ((silenceDuration >= 1100 && chunkDuration >= 1200) || chunkDuration >= 7000) {
            recorder.stop()
          }
        } else if (chunkDuration >= 3500) {
          // No speech in this interval, recycle chunk
          recorder.stop()
        }
      }, 100)
    }

    recorder.start(250)
  }, [processAudioChunk])

  const startWhisper = useCallback(async () => {
    try {
      // Audio constraints tailored for live calls & system speakers:
      // echoCancellation=false avoids filtering out remote participants on speaker output
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true
          }
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      streamRef.current = stream

      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Kick off the first record cycle
      recordAndTranscribe()

      return true
    } catch (err) {
      console.error('Microphone access error:', err)
      useSpeechStore.getState().setError('Microphone access denied. Check system permissions.')
      return false
    }
  }, [recordAndTranscribe])

  const startListening = useCallback(async () => {
    shouldListenRef.current = true
    const started = await startWhisper()

    if (started) {
      useSpeechStore.getState().setListening(true)
      useSpeechStore.getState().setError(null)
    }
  }, [startWhisper])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    useSpeechStore.getState().setListening(false)
    useSpeechStore.getState().setInterimTranscript('')

    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current)
      vadIntervalRef.current = null
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      } catch {
        // Recorder may already be inactive; nothing to clean up.
      }
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false
      stopListening()
    }
  }, [stopListening])

  return { startListening, stopListening }
}
