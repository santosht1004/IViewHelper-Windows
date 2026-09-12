import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'

export function createStealthWindow(): BrowserWindow {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize

  const win = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 320,
    minHeight: 400,
    x: screenWidth - 440,
    y: 20,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    focusable: true,
    show: false,
    // macOS: NSPanel with nonactivating style mask — receives input without activating the app
    ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Core stealth: exclude from screen capture
  win.setContentProtection(true)

  // Float over fullscreen apps and across all spaces without stealing focus
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Show without activating to avoid pulling focus from the foreground app
  win.once('ready-to-show', () => {
    win.showInactive()
  })

  // Load renderer
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
