import React, { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio'
import { useChatStore } from '../stores/chatStore'
import { useSettingsStore } from '../stores/settingsStore'
import { transcribeAudio } from '../api/whisper'
import { sendChatMessage } from '../lib/sendChatMessage'

export default function MessageInput() {
  const [text, setText] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [recording, setRecording] = useState(false)
  const { pendingImages, addImage, removeImage, clearImages, isStreaming } = useChatStore()
  const { setShowSettings, provider, getApiKeyValue } = useSettingsStore()
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6
    })
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType ?? 'image/jpeg'
      addImage(`data:${mime};base64,${result.assets[0].base64}`)
    }
  }

  async function toggleMic() {
    if (recording) {
      setRecording(false)
      await recorder.stop()
      const uri = recorder.uri
      if (!uri) return
      const key = await getApiKeyValue('openai')
      if (!key) {
        setShowSettings(true)
        return
      }
      setTranscribing(true)
      try {
        const transcript = await transcribeAudio(uri, key)
        if (transcript) setText(prev => (prev ? `${prev}\n${transcript}` : transcript))
      } catch (err) {
        console.warn('Transcription failed', err)
      } finally {
        setTranscribing(false)
      }
      return
    }

    const permission = await AudioModule.requestRecordingPermissionsAsync()
    if (!permission.granted) return
    await recorder.prepareToRecordAsync()
    recorder.record()
    setRecording(true)
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && pendingImages.length === 0) return
    if (isStreaming) return

    const key = await getApiKeyValue(provider)
    if (!key) {
      setShowSettings(true)
      return
    }

    const images = [...pendingImages]
    setText('')
    clearImages()
    await sendChatMessage(trimmed, images, key)
  }

  return (
    <View style={styles.container}>
      {pendingImages.length > 0 && (
        <ScrollView horizontal style={styles.imageStrip} showsHorizontalScrollIndicator={false}>
          {pendingImages.map((uri, i) => (
            <Pressable key={i} onPress={() => removeImage(i)} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <View style={styles.row}>
        <Pressable style={styles.iconButton} onPress={pickImage}>
          <ActivityIndicator style={{ display: 'none' }} />
          <View style={styles.iconGlyph}><ImageIcon /></View>
        </Pressable>
        <Pressable style={[styles.iconButton, recording && styles.iconButtonActive]} onPress={toggleMic} disabled={transcribing}>
          {transcribing ? <ActivityIndicator size="small" color="#93c5fd" /> : <View style={styles.iconGlyph}><MicIcon active={recording} /></View>}
        </Pressable>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ask anything..."
          placeholderTextColor="#6b7280"
          multiline
          editable={!isStreaming}
        />
        <Pressable
          style={[styles.sendButton, (!text.trim() && pendingImages.length === 0) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isStreaming}
        >
          <View style={styles.sendGlyph} />
        </Pressable>
      </View>
    </View>
  )
}

function ImageIcon() {
  return <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: '#9ca3af', borderRadius: 4 }} />
}

function MicIcon({ active }: { active: boolean }) {
  return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: active ? '#ef4444' : '#9ca3af' }} />
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: '#2c3140', padding: 10, backgroundColor: '#161a22' },
  imageStrip: { marginBottom: 8 },
  thumbWrap: { marginRight: 8 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2430',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  iconButtonActive: { backgroundColor: '#3f1d1d' },
  iconGlyph: { alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#1f2430',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#e5e7eb',
    fontSize: 14
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: { backgroundColor: '#33364a' },
  sendGlyph: { width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#fff', transform: [{ rotate: '-45deg' }] }
})
