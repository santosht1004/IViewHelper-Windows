import React, { useEffect } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import SettingsModal from '../components/SettingsModal'
import { useSettingsStore } from '../stores/settingsStore'
import { useChatStore } from '../stores/chatStore'

export default function ChatScreen() {
  const { loadSettings, loaded, setShowSettings } = useSettingsStore()
  const { clearChat } = useChatStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  if (!loaded) return null

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>InterviewHelper</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerButton} onPress={clearChat}>
            <Text style={styles.headerButtonText}>Clear</Text>
          </Pressable>
          <Pressable style={styles.headerButton} onPress={() => setShowSettings(true)}>
            <Text style={styles.headerButtonText}>Settings</Text>
          </Pressable>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <MessageList />
        <MessageInput />
      </KeyboardAvoidingView>
      <SettingsModal />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1218' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3140'
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1f2430', marginLeft: 8 },
  headerButtonText: { color: '#9ca3af', fontSize: 13 }
})
