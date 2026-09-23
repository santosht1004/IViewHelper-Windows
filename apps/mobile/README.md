# InterviewHelper Mobile

A React Native (Expo) companion app for Android and iOS. This is a **separate app** from the
Electron desktop app in the repo root — Electron cannot target mobile, so this is a
from-scratch mobile client that reuses the same AI provider APIs (OpenAI, Gemini).

## What's different from the desktop app

The desktop app's "stealth" behavior (invisible overlay excluded from screen capture, global
shortcuts, system tray) has no equivalent on Android/iOS and isn't included here. This is a
normal, visible chat app with:

- Chat with streaming responses (OpenAI or Gemini)
- Image attachment (photo library) for vision-capable models
- Voice input: record a clip, transcribed via OpenAI Whisper
- Settings screen for API keys (stored in Keychain/Keystore via `expo-secure-store`), model,
  reasoning effort, and system prompt

Groq and Alibaba providers from the desktop app aren't included; only OpenAI and Gemini are
wired up. The desktop app's system-prompt library (multiple saved prompts) is simplified to a
single editable prompt.

## Getting started

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app (Android/iOS) for the fastest way to try it during
development, or use `npx expo start --android` / `--ios` for a simulator/emulator.

## Building an installable app

This project uses [EAS Build](https://docs.expo.dev/build/introduction/), which builds in the
cloud, so a Windows machine can produce both Android **and** iOS binaries (no Mac required for
Android; iOS builds still need an Apple Developer account for signing).

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Android APK (sideloadable, like the desktop .exe)

```bash
eas build --platform android --profile preview
```

Produces a downloadable `.apk` you can install directly on a device.

### Android production (Play Store `.aab`)

```bash
eas build --platform android --profile production
```

### iOS (requires a paid Apple Developer account, $99/yr)

```bash
eas build --platform ios --profile preview
```

EAS will prompt to generate/upload signing credentials. The result is an `.ipa`; install it via
TestFlight (`eas submit --platform ios`) or ad-hoc distribution to registered devices — Apple
does not allow plain sideloading of `.ipa` files like Android's `.apk`.

## Notes

- `expo/fetch` is used for streaming SSE responses from OpenAI/Gemini — this requires the app to
  run in a real build or dev client (not needed for Expo Go on recent SDKs, but verify if you see
  streaming issues).
- API keys are stored per-device via `expo-secure-store`; there is no server component.
