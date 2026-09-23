import React, { useRef } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import MessageBubble from './MessageBubble'
import Markdown from './Markdown'
import { useChatStore } from '../stores/chatStore'

export default function MessageList() {
  const { messages, isStreaming, streamingContent, error } = useChatStore()
  const listRef = useRef<FlatList>(null)

  const data = [...messages]

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      data={data}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={
        !isStreaming ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Start a conversation</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        <>
          {isStreaming && (
            <View style={[styles.row]}>
              <View style={styles.assistantBubble}>
                {streamingContent ? <Markdown content={streamingContent} /> : <ActivityIndicator color="#93c5fd" />}
              </View>
            </View>
          )}
          {error && (
            <View style={styles.errorBubble}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#6b7280', fontSize: 14 },
  row: { width: '100%', marginBottom: 12, flexDirection: 'row', justifyContent: 'flex-start' },
  assistantBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1f2430',
    borderWidth: 1,
    borderColor: '#2c3140'
  },
  errorBubble: {
    backgroundColor: '#3f1d1d',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 12,
    padding: 12,
    marginTop: 4
  },
  errorText: { color: '#fca5a5', fontSize: 13 }
})
