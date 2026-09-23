# InterviewHelper (monorepo)

npm workspaces monorepo with:

- [apps/desktop](apps/desktop) — Electron desktop app (Windows/macOS/Linux), see its [README](apps/desktop/README.md).
- [apps/mobile](apps/mobile) — Expo/React Native app (Android/iOS), see its [README](apps/mobile/README.md).
- [packages/shared](packages/shared) — Types shared between both apps (`@interviewhelper/shared`).

## Setup

```bash
npm install
```

Installs and links all workspaces from the root. Run `npm run <script>` from the root (see
[package.json](package.json) for shortcuts) or `cd` into a specific app and use its own scripts.
