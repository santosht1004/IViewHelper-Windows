import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useSettingsStore } from '../stores/settingsStore'
import { DEFAULT_MODEL, PROVIDERS, REASONING_EFFORTS, type Provider } from '../lib/types'

export default function SettingsModal() {
  const {
    showSettings,
    setShowSettings,
    provider,
    setProvider,
    model,
    setModel,
    systemPrompt,
    setSystemPrompt,
    reasoningEffort,
    setReasoningEffort,
    hasApiKey,
    setApiKey
  } = useSettingsStore()

  const [openaiKeyInput, setOpenaiKeyInput] = useState('')
  const [geminiKeyInput, setGeminiKeyInput] = useState('')

  async function saveKey(p: Provider, value: string) {
    if (!value.trim()) return
    await setApiKey(p, value.trim())
    if (p === 'openai') setOpenaiKeyInput('')
    else setGeminiKeyInput('')
  }

  return (
    <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Settings</Text>

          <Text style={styles.label}>Provider</Text>
          <View style={styles.row}>
            {PROVIDERS.map(p => (
              <Pressable
                key={p}
                style={[styles.pill, provider === p && styles.pillActive]}
                onPress={() => setProvider(p)}
              >
                <Text style={[styles.pillText, provider === p && styles.pillTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>OpenAI API Key {hasApiKey.openai ? '(saved)' : ''}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="sk-..."
            placeholderTextColor="#6b7280"
            value={openaiKeyInput}
            onChangeText={setOpenaiKeyInput}
            onEndEditing={() => saveKey('openai', openaiKeyInput)}
          />

          <Text style={styles.label}>Gemini API Key {hasApiKey.gemini ? '(saved)' : ''}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="AIzaSy..."
            placeholderTextColor="#6b7280"
            value={geminiKeyInput}
            onChangeText={setGeminiKeyInput}
            onEndEditing={() => saveKey('gemini', geminiKeyInput)}
          />

          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder={DEFAULT_MODEL[provider]}
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.label}>Reasoning effort</Text>
          <View style={styles.row}>
            {REASONING_EFFORTS.map(effort => (
              <Pressable
                key={effort}
                style={[styles.pill, reasoningEffort === effort && styles.pillActive]}
                onPress={() => setReasoningEffort(effort)}
              >
                <Text style={[styles.pillText, reasoningEffort === effort && styles.pillTextActive]}>{effort}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>System prompt</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            multiline
          />
        </ScrollView>

        <Pressable style={styles.closeButton} onPress={() => setShowSettings(false)}>
          <Text style={styles.closeText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1218', paddingTop: 60 },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  label: { color: '#9ca3af', fontSize: 13, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#1f2430', marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#4f46e5' },
  pillText: { color: '#9ca3af', fontSize: 13 },
  pillTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1f2430',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e5e7eb',
    fontSize: 14
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  closeButton: {
    margin: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  closeText: { color: '#fff', fontSize: 15, fontWeight: '600' }
})
