import { Tray, Menu, BrowserWindow, nativeImage, app, type NativeImage } from 'electron'

let tray: Tray | null = null

function createTrayIcon(): NativeImage {
  // Create a 32x32 icon with a simple "iV" design using raw RGBA buffer
  const size = 32
  const buffer = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const cx = x - size / 2
      const cy = y - size / 2
      const dist = Math.sqrt(cx * cx + cy * cy)

      if (dist < 14) {
        // Circle fill
        buffer[idx] = 108     // R
        buffer[idx + 1] = 99  // G
        buffer[idx + 2] = 255 // B
        buffer[idx + 3] = dist < 12 ? 255 : 128 // A (anti-alias edge)
      } else {
        buffer[idx + 3] = 0 // Transparent
      }
    }
  }

  const icon = nativeImage.createFromBuffer(buffer, { width: size, height: size })

  if (process.platform === 'darwin') {
    const resized = icon.resize({ width: 16, height: 16 })
    resized.setTemplateImage(true)
    return resized
  }

  return icon
}

export function createTray(mainWindow: BrowserWindow): void {
  const icon = createTrayIcon()

  tray = new Tray(icon)
  tray.setToolTip('iViewHelper')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.showInactive()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.showInactive()
    }
  })
}
