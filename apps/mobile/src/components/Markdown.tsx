import React from 'react'
import { StyleSheet, Text } from 'react-native'

// Lightweight Markdown renderer: bold/italic/inline-code + paragraph breaks, no extra dependency.
export default function Markdown({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <Text style={styles.text}>
      {lines.map((line, i) => (
        <Text key={i}>
          {renderInline(line)}
          {i < lines.length - 1 ? '\n' : ''}
        </Text>
      ))}
    </Text>
  )
}

function renderInline(line: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={i} style={styles.code}>
          {part.slice(1, -1)}
        </Text>
      )
    }
    return part
  })
}

const styles = StyleSheet.create({
  text: { color: '#e5e7eb', fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '700' },
  code: { fontFamily: 'monospace', backgroundColor: '#11151c', color: '#93c5fd' }
})
