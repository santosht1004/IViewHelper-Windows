# iViewHelper

> A privacy-focused, stealth AI assistant desktop app for meetings, interviews, and screen-sharing sessions.

iViewHelper floats as an always-on-top, invisible overlay that is excluded from screen captures and screenshots. It pairs speech-to-text, screenshot capture, and vision-enabled chat (OpenAI, Groq, Google Gemini, or Alibaba Cloud Model Studio) into a single keyboard-driven companion that stays out of sight while you work.

## Features

- **Stealth window** — frameless, transparent, always-on-top, hidden from dock/taskbar, and excluded from screen capture (`setContentProtection` on macOS, `WDA_EXCLUDEFROMCAPTURE` on Windows).
- **Streaming chat** — OpenAI, Groq, Gemini, or Alibaba (`qwen3.5-omni-flash`) with vision support where the model allows it. Responses stream in and can be cancelled (clearing the chat aborts the in-flight request).
- **Speech-to-text** — Whisper (OpenAI or Groq), Gemini, or Qwen-Omni audio transcription (recordings are sent as-is, no conversion), with client-side voice activity detection and a filter for common silence hallucinations.
- **Launch password** — the app stays locked (no settings, chat, or shortcuts) until the password is entered.
- **Screenshot capture** — captures the screen excluding the app's own window. Multiple shots can be attached to a single message and sent as `image_url` blocks.
- **System prompts** — full CRUD with three defaults shipped (General Assistant, Technical Interview Helper, Meeting Notes). Switch active prompt from the control bar.
- **Global keyboard shortcuts** — every action is reachable system-wide, even when the app is unfocused.
- **Adjustable opacity** (10–100%), font size (12/14/16/18px), and 3-stop window snap (left/center/right).
- **Markdown rendering** — GitHub-flavored markdown with syntax-highlighted code blocks.
- **Persistent storage** — settings and prompts saved via `electron-store`; API keys encrypted with the OS keychain.

## Tech Stack

- **Electron 35** with `electron-vite`
- **React 19** + **TypeScript** + **Tailwind CSS 4**
- **Zustand** for state management
- **OpenAI SDK** for OpenAI/Groq/Alibaba (DashScope compatible mode) chat and Whisper; `fetch` against the Gemini REST API
- **electron-builder** for DMG (macOS universal), portable exe (Windows x64/arm64), and AppImage (Linux x64)
- **Vitest** for unit tests, **ESLint** (typescript-eslint + react-hooks) for linting

## Project Layout

```
src/
├── shared/         IPC types shared by main, preload, and renderer
├── main/           Electron main process
│   ├── index.ts                App entry, lifecycle
│   ├── window.ts               Stealth BrowserWindow setup
│   ├── ipc-handlers.ts         IPC channels + input validation
│   ├── auth.ts / lockout.ts    Launch password and persisted lockout policy
│   ├── secrets.ts              Encrypted API key storage (safeStorage)
│   ├── settings-validation.ts  Allow-list for renderer-writable settings
│   ├── openai.ts               OpenAI/Groq/Alibaba streaming chat + transcription
│   ├── audio.ts                Recorder MIME type handling
│   ├── gemini.ts               Gemini streaming chat + transcription
│   ├── transcript-filter.ts    Whisper hallucination filter
│   ├── screenshot.ts           Screen capture (screencapture / desktopCapturer)
│   ├── shortcuts.ts            Global keyboard shortcuts
│   ├── tray.ts                 System tray
│   ├── store.ts                electron-store persistence
│   └── __tests__/              Vitest unit tests
├── preload/        contextBridge IPC API (sandboxed)
└── renderer/       React UI
    └── src/
        ├── components/   TitleBar, LockScreen, Chat, Controls, Settings
        ├── hooks/        useSpeechRecognition
        ├── stores/       chat, settings, speech (Zustand)
        └── lib/
```

See [`PROMPT.md`](./PROMPT.md) for the full architecture and behavioural spec.

## Getting Started

### Prerequisites

- Node.js 18+
- An API key for OpenAI, Groq, Google AI Studio (Gemini), or Alibaba Cloud Model Studio
- **macOS**: Screen Recording permission (System Settings → Privacy & Security → Screen Recording). In dev, grant it to your terminal.

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

The app opens as a floating window in the top-right corner. Enter the launch password, then open the settings panel (gear icon), pick a provider, and save its API key.

### Checks

```bash
npm run typecheck   # main/preload and renderer TypeScript projects
npm run lint        # ESLint
npm test            # Vitest unit tests
```

An opt-in live test hits the real Alibaba API when a key is provided (otherwise skipped):

```bash
IVIEW_LIVE_KEY=<singapore-model-studio-key> \
  IVIEW_LIVE_WEBM=/path/to/clip.webm IVIEW_LIVE_IMG=/path/to/image.png \
  npx vitest run src/main/__tests__/live-alibaba.test.ts
```

## Build & Package

```bash
npm run build           # build only
npm run package:mac     # macOS DMG (universal)
npm run package:win     # Windows portable exe (x64 + arm64)
npm run package:linux   # Linux AppImage (x64)
npm run package:all     # all three
```

Cross-platform builds require platform-specific runners — you cannot cross-compile.

## Keyboard Shortcuts

All shortcuts work system-wide.

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+Shift+H` | Show / hide window |
| `Cmd/Ctrl+Shift+M` | Toggle microphone |
| `Cmd/Ctrl+Shift+S` | Take screenshot |
| `Cmd/Ctrl+Shift+R` | Clear chat |
| `Cmd/Ctrl+Shift+Backspace` | Clear message input |
| `Cmd/Ctrl+Shift+E` | Focus message input |
| `Cmd/Ctrl+Shift+F` | Find in chat |
| `Cmd/Ctrl+Shift+↑ / ↓` | Scroll chat |
| `Cmd/Ctrl+Shift+← / →` | Snap window left / center / right |
| `Enter` | Send message |
| `Shift+Enter` | New line |

## Configuration

Persistent settings (stored in `electron-store`):

```json
{
  "provider": "openai",
  "alibabaRegion": "singapore",
  "model": "gpt-5.4",
  "opacity": 0.95,
  "fontSize": 14,
  "sttProvider": "whisper",
  "reasoningEffort": "medium",
  "activeSystemPromptId": "default-general",
  "systemPrompts": [],
  "secureApiKeys": {},
  "authState": { "failures": 0, "lockedUntil": 0 },
  "windowBounds": null
}
```

API keys are set from the settings panel only; there is no environment-variable override.

## Alibaba Cloud Model Studio

Selecting the **Alibaba** provider uses a single omni model, `qwen3.5-omni-flash`, for chat, screenshots, and mic transcription through the DashScope OpenAI-compatible endpoint.

- **Region** — Model Studio API keys only work in the region where they were created. Pick Singapore (`dashscope-intl.aliyuncs.com`), US Virginia (`dashscope-us.aliyuncs.com`), or Beijing (`dashscope.aliyuncs.com`) in settings to match your key.
- **Audio** — mic recordings are sent in the recorder's native WebM/Opus format without conversion; Model Studio accepts it (verified against `qwen3.5-omni-flash` in the Singapore region).
- **Reasoning** — the reasoning-effort selector stays disabled for this model.

## Security Model

- **API keys** are encrypted with Electron `safeStorage` (macOS Keychain, Windows DPAPI, Linux secret service) and decrypted only in the main process. The renderer can write a key but only ever learns whether one is set. If OS encryption is unavailable (e.g. Linux without a keyring), keys fall back to plaintext and the settings panel says so. Keys saved in plaintext by older versions are migrated on launch.
- **Launch password** — only a salted scrypt hash ships in the binary. Every 5 failed attempts triggers a lockout (1 min, 5 min, 15 min, then 1 hour) that is persisted across restarts. The lockout lives in the settings file, so it deters casual guessing but is not a substitute for OS account security.
- **IPC** — every channel except basic window controls is refused until unlocked; settings writes go through an allow-list with type checks; the renderer runs with `contextIsolation` and `sandbox` enabled.
- **Gemini** requests send the key in the `X-goog-api-key` header, never in the URL.

## Known Limitations

1. **macOS 15+ (Sequoia)** — `setContentProtection` is broken against ScreenCaptureKit-based apps (Zoom desktop, OBS, QuickTime). It still works against browser-based tools (Google Meet, Teams web). Use the opacity slider and `Cmd+Shift+H` as mitigations.
2. **Screenshots** capture the primary display only. On macOS they require Screen Recording permission; in dev mode, grant it to your terminal application.
3. **Whisper recording cycles** — each cycle stops and restarts the MediaRecorder so the resulting audio file has valid headers. Mid-stream chunks without headers are rejected by the API.

## License

Private / unpublished.
