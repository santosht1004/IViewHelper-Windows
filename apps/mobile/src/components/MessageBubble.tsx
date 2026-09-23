import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import Markdown from './Markdown'
import type { Message } from '../lib/types'

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {message.images.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.image} />
        ))}
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <Markdown content={message.content} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { width: '100%', marginBottom: 12, flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: '#4f46e5' },
  bubbleAssistant: { backgroundColor: '#1f2430', borderWidth: 1, borderColor: '#2c3140' },
  userText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  image: { width: 160, height: 120, borderRadius: 8, marginBottom: 6 }
})
