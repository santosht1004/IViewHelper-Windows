import { globalShortcut, BrowserWindow, screen } from 'electron'

let animating = false

function moveWindowToEdge(win: BrowserWindow, side: 'left' | 'right'): void {
  if (animating) return
  animating = true

  const display = screen.getDisplayMatching(win.getBounds())
  const { x: sx, width: sw } = display.workArea
  const [winW] = win.getSize()
  const [startX, startY] = win.getPosition()
  const gap = 20

  const leftX = sx + gap
  const centerX = sx + Math.round((sw - winW) / 2)
  const rightX = sx + sw - winW - gap
  const threshold = 40

  let targetX: number
  const atLeft = Math.abs(startX - leftX) < threshold
  const atCenter = Math.abs(startX - centerX) < threshold
  const atRight = Math.abs(startX - rightX) < threshold

  if (side === 'left') {
    if (atLeft) targetX = leftX          // already left, stay
    else if (atCenter) targetX = leftX   // center -> left
    else targetX = centerX              // right (or anywhere) -> center
  } else {
    if (atRight) targetX = rightX        // already right, stay
    else if (atCenter) targetX = rightX  // center -> right
    else targetX = centerX              // left (or anywhere) -> center
  }

  const targetY = startY

  const steps = 20
  const duration = 300
  const interval = duration / steps
  let step = 0

  const timer = setInterval(() => {
    step++
    // Ease-out cubic
    const t = step / steps
    const ease = 1 - Math.pow(1 - t, 3)

    const x = Math.round(startX + (targetX - startX) * ease)
    const y = Math.round(startY + (targetY - startY) * ease)
    win.setPosition(x, y)

    if (step >= steps) {
      clearInterval(timer)
      win.setPosition(targetX, targetY)
      animating = false
    }
  }, interval)
}

export function registerShortcuts(mainWindow: BrowserWindow): void {
  // Toggle show/hide
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.showInactive()
    }
  })

  // Toggle mic
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    mainWindow.webContents.send('shortcut-toggle-mic')
  })

  // Take screenshot
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow.webContents.send('shortcut-screenshot')
  })

  // Clear chat
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    mainWindow.webContents.send('shortcut-clear-chat')
  })

  // Clear message input (Cmd+Shift+Backspace)
  globalShortcut.register('CommandOrControl+Shift+Backspace', () => {
    mainWindow.webContents.send('shortcut-clear-input')
  })

  // Focus message input — panel.focus() makes it the key window (receives keystrokes)
  // without activating the app, so Chrome stays foregrounded.
  globalShortcut.register('CommandOrControl+Shift+E', () => {
    if (!mainWindow.isVisible()) mainWindow.showInactive()
    mainWindow.focus()
    mainWindow.webContents.send('shortcut-focus-input')
  })

  // Find in chat
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (!mainWindow.isVisible()) mainWindow.showInactive()
    mainWindow.focus()
    mainWindow.webContents.send('shortcut-find-in-chat')
  })

  // Scroll chat up/down
  globalShortcut.register('CommandOrControl+Shift+Up', () => {
    mainWindow.webContents.send('shortcut-scroll', 'up')
  })

  globalShortcut.register('CommandOrControl+Shift+Down', () => {
    mainWindow.webContents.send('shortcut-scroll', 'down')
  })

  // Move window left/right edge
  globalShortcut.register('CommandOrControl+Shift+Left', () => {
    moveWindowToEdge(mainWindow, 'left')
  })

  globalShortcut.register('CommandOrControl+Shift+Right', () => {
    moveWindowToEdge(mainWindow, 'right')
  })
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
