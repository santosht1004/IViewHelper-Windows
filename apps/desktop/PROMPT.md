# iViewHelper - Complete Software Specification

> Use this document as a prompt to recreate this software on any platform or framework.

## Overview

**iViewHelper** is a privacy-focused, stealth AI assistant desktop application designed for use during meetings, interviews, and screen-sharing sessions. The app floats as an invisible overlay that cannot be seen by others during screen shares or screenshots. It provides speech-to-text transcription, screenshot capture, and AI-powered responses via OpenAI's API.

## Core Philosophy

- **Total stealth**: The window must not appear in screen shares, screenshots, screen recordings, taskbar, or dock
- **Keyboard-driven**: Every action has a global keyboard shortcut that works even when the app is not focused
- **Minimal footprint**: Small, frameless, transparent, always-on-top floating window
- **Chat-based UX**: Conversation interface with markdown-rendered AI responses

---

## Features

### 1. Stealth Window

- Frameless, transparent, always-on-top window
- Excluded from screen capture using platform APIs:
  - **macOS**: `setContentProtection(true)` (works against browser-based tools like Google Meet, Teams; broken against ScreenCaptureKit apps like Zoom, OBS on macOS 15+)
  - **Windows**: `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` (fully works)
- Hidden from dock (macOS) and taskbar (Windows)
- System tray icon as the only persistent UI handle (right-click menu: Show/Hide, Quit)
- Adjustable opacity (10%-100%) for manual stealth
- No window shadow
- Draggable via custom title bar
- Default position: top-right corner of screen
- Default size: 420x700px, min 320x400px

### 2. Chat Interface

- Scrollable message list with user and assistant message bubbles
- User messages: indigo gradient background, right-aligned, white text
- Assistant messages: dark card background, left-aligned, with border
- Avatar icons next to each message (User icon, Bot icon)
- Empty state: centered icon with "Start a conversation" text
- Streaming responses: shows "Thinking..." spinner, then streams text incrementally
- Error messages: red-tinted card with error text
- Messages have 16px gap between them
- Bubble padding: 12px vertical, 16px horizontal

### 3. Message Input

- Multi-line textarea (2 rows default, expands up to 160px)
- Styled input container with rounded corners and border
- Send button with indigo background and glow effect when message is ready
- Enter sends message, Shift+Enter for new line
- Enter sends even when textarea is not focused (if there's content)
- Disabled during streaming
- If no API key set, clicking send opens settings

### 4. Speech-to-Text (Dual Provider)

#### Primary: Web Speech API
- Uses `webkitSpeechRecognition` or `SpeechRecognition` (Chromium built-in)
- Continuous mode with interim results
- Auto-restarts on silence (300ms delay)
- Interim transcript shown as styled preview above the input area (italic, accent color, not mixed into textarea)
- Final transcripts appended to textarea on new lines

#### Fallback: OpenAI Whisper API
- Records audio via MediaRecorder in 4-second cycles
- Each cycle: start recorder -> record 4s -> stop -> send complete audio file to Whisper API -> start new cycle
- **Critical**: Each recording cycle must produce a complete audio file with headers (stop/restart MediaRecorder each cycle, don't split mid-stream)
- Uses `audio/webm;codecs=opus` mime type (with fallbacks)
- Skips silent chunks (< 2KB)
- Language locked to English (`language: 'en'`)
- Uses the same OpenAI API key as chat

#### Mic Toggle
- Visual indicator: red dot + pulse animation when active
- Toggleable via button or global shortcut

### 5. Screenshot Capture

- Captures the screen excluding the app's own window
- **macOS**: Uses native `screencapture` CLI command (more reliable than desktopCapturer)
  - Tries `screencapture -x -t png -D 1` first (main display)
  - Falls back to `screencapture -x -t png` (basic)
  - Falls back to Electron `desktopCapturer` API
- **Windows**: Uses Electron `desktopCapturer.getSources()` with screen type
- Hide/capture/restore pattern: hide app window -> wait 300ms -> capture -> show window
- Multiple screenshots can be attached to a single message
- Screenshots shown as removable thumbnails (20px height) with X button on hover
- Screenshots sent as `image_url` content blocks in the OpenAI API (vision)

### 6. OpenAI Integration

- Streaming chat completions with vision support
- API calls happen in the main process (API key never exposed to renderer)
- System prompt prepended to every request
- Messages with screenshots converted to multi-modal format:
  ```json
  {
    "role": "user",
    "content": [
      { "type": "text", "text": "user message" },
      { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
    ]
  }
  ```
- Stream chunks sent to renderer via IPC events (`openai-stream-chunk`, `openai-stream-done`, `openai-stream-error`)
- Supported models (configurable):
  - GPT-5.4 (default), GPT-5.4 Mini
  - GPT-5.3, GPT-5.2
  - GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano
  - GPT-4o, GPT-4o Mini
  - o4 Mini, o3, o3 Mini, o3 Pro, o1

### 7. System Prompts

- CRUD for system prompts (create, read, update, delete)
- All prompts are editable and deletable (including defaults)
- Stored persistently via electron-store
- 3 default prompts shipped:
  1. **General Assistant**: Clear, concise answers, screenshot analysis
  2. **Technical Interview Helper**: Hints without direct answers, step-by-step guidance
  3. **Meeting Notes**: Summarize discussions, action items, key decisions
- Dropdown selector in the control bar to switch active prompt
- Active prompt sent as `system` message in every API call

### 8. Settings Panel

- Full-screen overlay within the app
- Sections:
  - **API Key**: Password input with show/hide toggle
  - **Font Size**: 4 options (Small 12px, Medium 14px, Large 16px, X-Large 18px) as toggle buttons
  - **STT Provider**: Dropdown (Web Speech API / OpenAI Whisper)
  - **System Prompts**: List with edit/delete on hover + "New Prompt" button
  - **macOS Warning**: Yellow alert about macOS 15+ ScreenCaptureKit limitation
  - **Keyboard Shortcuts**: Reference table

### 9. Font Size Control

- 4 sizes: 12px, 14px (default), 16px, 18px
- Applied via CSS variable `--font-size` on `:root`
- Affects all text including markdown content
- Persisted in settings

### 10. Opacity Control

- Range slider (10%-100%)
- Controls the entire window opacity via `BrowserWindow.setOpacity()`
- Shows percentage value next to slider
- Persisted in settings

### 11. Markdown Rendering

- Full GitHub-flavored markdown support (tables, strikethrough, task lists)
- Syntax-highlighted code blocks
- Styled elements: blockquotes with accent border, inline code with accent tint, links
- Responsive typography that respects the font size setting

---

## Global Keyboard Shortcuts

All shortcuts work system-wide, even when the app is not focused.

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+H` | Show/Hide window |
| `Cmd/Ctrl+Shift+M` | Toggle microphone on/off |
| `Cmd/Ctrl+Shift+S` | Take screenshot |
| `Cmd/Ctrl+Shift+R` | Clear chat history |
| `Cmd/Ctrl+Shift+Backspace` | Clear message input box |
| `Cmd/Ctrl+Shift+E` | Focus message input (shows window if hidden) |
| `Cmd/Ctrl+Shift+Up` | Scroll chat up |
| `Cmd/Ctrl+Shift+Down` | Scroll chat down |
| `Cmd/Ctrl+Shift+Left` | Move window left (3-stop: right->center->left) |
| `Cmd/Ctrl+Shift+Right` | Move window right (3-stop: left->center->right) |
| `Enter` | Send message (works even when input not focused) |
| `Shift+Enter` | New line in message input |

### Window Movement Behavior

- 3-position system: left edge, center, right edge (20px gap from edges)
- Smooth animated movement (300ms, cubic ease-out, 20 steps)
- Pressing left from right goes to center first, then left on next press
- Pressing right from left goes to center first, then right on next press
- Animation prevents double-triggering

---

## Design / UI Theme

### Color Palette (Dark Theme)

```
Background Primary:    #0f1117
Background Secondary:  #1a1d27
Background Tertiary:   #232733
User Bubble:           linear-gradient(135deg, #4f46e5, #6366f1)
Assistant Bubble:      #1e2230
Text Primary:          #f0f2f8
Text Secondary:        #8b8fa3
Text Muted:            #5c6072
Accent:                #6366f1
Accent Glow:           rgba(99, 102, 241, 0.15)
Accent Hover:          #818cf8
Border:                rgba(255, 255, 255, 0.06)
Border Accent:         rgba(99, 102, 241, 0.3)
Danger:                #ef4444
Success:               #22c55e
Warning:               #eab308
```

### Layout Structure

```
+--------------------------------------------------+  <- 8px outer padding, rounded 2xl
| +----------------------------------------------+ |
| | [iV] iViewHelper          [gear] [-] [x]     | |  <- Title bar (draggable)
| +----------------------------------------------+ |
| | [Prompt Selector v]  [Model Selector v]       | |  <- Control bar
| | [Mic] [Camera] [Clear]     [Eye slider 95%]  | |
| +----------------------------------------------+ |
| |                                                | |
| |  [Bot] Assistant bubble with markdown          | |  <- Message list (scrollable)
| |                                                | |
| |          User bubble with gradient    [User]   | |
| |          [screenshot thumbnail]                | |
| |                                                | |
| |  [Bot] Streaming response...                   | |
| |                                                | |
| +----------------------------------------------+ |
| | [img1] [img2] [x]                             | |  <- Image preview (if screenshots)
| +----------------------------------------------+ |
| | interim transcript preview...                  | |  <- STT preview
| | +------------------------------------------+  | |
| | | Message input textarea...          [Send] |  | |  <- Input area
| | +------------------------------------------+  | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

### Spacing Guidelines

- App wrapper: 8px padding, border, box-shadow `0 8px 32px rgba(0,0,0,0.4)`
- Title bar: `px-4 py-3`
- Control bar: `px-4 py-3`, `gap-2.5` between rows
- Message list container: `px-3 py-5`
- Gap between messages: 16px (`gap-4`)
- Message bubble padding: `12px 16px` (inline style)
- Message input outer: `px-4 py-3.5`
- Message input inner container: rounded-xl with `px-3.5 py-2.5`
- Settings panel: `p-5`

---

## Architecture

### Process Model (Electron-based)

```
Main Process
  ├── Window management (stealth config)
  ├── OpenAI API calls (streaming chat + Whisper STT)
  ├── Screenshot capture
  ├── Global keyboard shortcuts
  ├── System tray
  ├── Persistent storage (electron-store)
  └── IPC handlers

Preload Script
  └── contextBridge exposing type-safe IPC API

Renderer Process (React)
  ├── Components (TitleBar, Chat, Controls, Settings)
  ├── Zustand stores (chat, settings, speech)
  ├── Hooks (useSpeechRecognition, useOpenAI, useScreenshot)
  └── Tailwind CSS styling
```

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `window-minimize` | Renderer->Main | Hide window |
| `window-close` | Renderer->Main | Close app |
| `set-opacity` | Renderer->Main | Set window opacity |
| `capture-screenshot` | Renderer->Main (invoke) | Capture screen |
| `openai-chat` | Renderer->Main (invoke) | Start streaming chat |
| `openai-stream-chunk` | Main->Renderer | Stream text chunk |
| `openai-stream-done` | Main->Renderer | Stream complete |
| `openai-stream-error` | Main->Renderer | Stream error |
| `whisper-transcribe` | Renderer->Main (invoke) | Transcribe audio |
| `get-settings` / `save-settings` | Renderer->Main | Settings CRUD |
| `get-system-prompts` / `save-system-prompt` / `delete-system-prompt` | Renderer->Main | Prompts CRUD |
| `shortcut-toggle-mic` | Main->Renderer | Mic shortcut |
| `shortcut-screenshot` | Main->Renderer | Screenshot shortcut |
| `shortcut-clear-chat` | Main->Renderer | Clear chat shortcut |
| `shortcut-clear-input` | Main->Renderer | Clear input shortcut |
| `shortcut-focus-input` | Main->Renderer | Focus input shortcut |
| `shortcut-scroll` | Main->Renderer | Scroll up/down shortcut |

### State Management (Zustand)

**Chat Store**: messages array, pending screenshots, streaming state, streaming content, error

**Settings Store**: API key, model, opacity, font size, STT provider, active prompt ID, system prompts list, show settings flag

**Speech Store**: isListening, interim transcript, error

---

## Persistent Storage

Stored via electron-store (JSON file on disk):

```json
{
  "apiKey": "",
  "model": "gpt-5.4",
  "opacity": 0.95,
  "fontSize": 14,
  "sttProvider": "webspeech",
  "activeSystemPromptId": "default-general",
  "systemPrompts": [...],
  "windowBounds": null
}
```

---

## Packaging & Distribution

- **macOS**: DMG installer, universal binary (ARM + Intel)
  - `LSUIElement: true` in Info.plist (hides from dock)
  - Entitlements: JIT, unsigned memory, audio input
  - Hardened runtime enabled
- **Windows**: NSIS one-click installer (x64)
- Cross-platform build requires platform-specific CI (cannot cross-compile)

---

## Known Limitations

1. **macOS 15+ (Sequoia)**: `setContentProtection` is broken against ScreenCaptureKit. The window WILL be visible in Zoom desktop, OBS, and QuickTime. No workaround exists (exhaustively researched: CGWindowLevel, CALayer, IOSurface, Metal, private APIs, NSPanel - none work). Mitigations: opacity slider, instant hide hotkey. Still works against browser-based tools (Google Meet, Teams web).

2. **Web Speech API**: May fail with "network error" in some Electron configurations. Fallback to Whisper is available.

3. **Screenshot on macOS**: Requires Screen Recording permission in System Settings > Privacy & Security. In dev mode, grant to terminal app.

4. **Whisper audio format**: Each recording cycle must stop/restart the MediaRecorder to produce a complete file with headers. Sending mid-stream chunks without headers causes "Invalid file format" errors.
