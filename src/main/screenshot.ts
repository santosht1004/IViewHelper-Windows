import { BrowserWindow, desktopCapturer, screen } from 'electron'
import { execFile } from 'child_process'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export async function captureScreen(mainWindow: BrowserWindow): Promise<string> {
  // Hide our window so it's not in the capture
  mainWindow.hide()
  await new Promise(resolve => setTimeout(resolve, 300))

  try {
    let base64: string

    if (process.platform === 'darwin') {
      base64 = await captureMacOS()
    } else {
      base64 = await captureWithDesktopCapturer()
    }

    return `data:image/png;base64,${base64}`
  } finally {
    // Always restore our window
    mainWindow.show()
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

async function captureMacOS(): Promise<string> {
  // Try multiple approaches in order of reliability
  const errors: string[] = []

  // Attempt 1: screencapture with main display flag
  try {
    return await screencaptureCmd(['-x', '-t', 'png', '-D', '1'])
  } catch (e) {
    errors.push(`screencapture -D1: ${errorMessage(e)}`)
  }

  // Attempt 2: screencapture basic (no -C, no -D)
  try {
    return await screencaptureCmd(['-x', '-t', 'png'])
  } catch (e) {
    errors.push(`screencapture basic: ${errorMessage(e)}`)
  }

  // Attempt 3: desktopCapturer as fallback
  try {
    return await captureWithDesktopCapturer()
  } catch (e) {
    errors.push(`desktopCapturer: ${errorMessage(e)}`)
  }

  throw new Error(
    'Screenshot failed. Grant Screen Recording permission in System Settings > Privacy & Security. ' +
    `Details: ${errors.join('; ')}`
  )
}

async function screencaptureCmd(args: string[]): Promise<string> {
  const tmpFile = join(tmpdir(), `iviewhelper-${randomUUID()}.png`)

  await new Promise<void>((resolve, reject) => {
    execFile('screencapture', [...args, tmpFile], { timeout: 5000 }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

  const buffer = await readFile(tmpFile)
  unlink(tmpFile).catch(() => {})

  if (buffer.length < 100) {
    throw new Error('Screenshot file is empty')
  }

  return buffer.toString('base64')
}

async function captureWithDesktopCapturer(): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size
  const scaleFactor = primaryDisplay.scaleFactor

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.floor(width * scaleFactor),
      height: Math.floor(height * scaleFactor)
    }
  })

  // Source order isn't guaranteed to match display order, so match on display id.
  const primarySource =
    sources.find(source => source.display_id === String(primaryDisplay.id)) ?? sources[0]
  if (!primarySource) {
    throw new Error('No screen source found')
  }

  const screenshot = primarySource.thumbnail.toPNG()
  return screenshot.toString('base64')
}
