import { app, BrowserWindow } from 'electron'
import { createStealthWindow } from './window'
import { registerIpcHandlers } from './ipc-handlers'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { createTray } from './tray'
import { onUnlock } from './auth'
import { migrateLegacyApiKeys } from './secrets'

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
  // Hide from dock on macOS
  app.dock?.hide()

  // safeStorage is only usable after 'ready'.
  migrateLegacyApiKeys()

  mainWindow = createStealthWindow()
  registerIpcHandlers(mainWindow)
  createTray(mainWindow)

  // Global shortcuts stay off until the launch password is accepted.
  onUnlock(() => {
    if (mainWindow && !mainWindow.isDestroyed()) registerShortcuts(mainWindow)
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', () => {
  unregisterShortcuts()
})

// IPC handlers, the tray, and shortcuts are bound to the single main window, and the
// app quits when it closes, so re-activation just brings that window back.
app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
    mainWindow.showInactive()
  }
})
