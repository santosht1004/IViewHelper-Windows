/// <reference types="vite/client" />
import 'react'

declare module 'react' {
  interface CSSProperties {
    // Electron's draggable-region property for frameless windows.
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}
