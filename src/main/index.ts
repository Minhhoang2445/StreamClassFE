import { app, BrowserWindow, ipcMain, shell, desktopCapturer, session } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

interface HttpRequestPayload {
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
}

function registerHttpBridge(): void {
  ipcMain.handle('http:request', async (_, payload: HttpRequestPayload) => {
    const targetUrl = new URL(payload.url)

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      throw new Error('Only http and https requests are allowed')
    }

    const response = await fetch(targetUrl, {
      method: payload.method,
      headers: payload.headers,
      body: payload.body
    })

    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    return {
      data: await response.text(),
      headers,
      status: response.status,
      statusText: response.statusText
    }
  })
}

function registerScreenShareHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window']
        })

        if (!sources.length) {
          console.error('[screen-share] No screen/window sources found')
          callback({})
          return
        }

        console.log(
          '[screen-share] available sources:',
          sources.map((source) => ({
            id: source.id,
            name: source.name
          }))
        )

        callback({
          video: sources[0]
        })
      } catch (error) {
        console.error('[screen-share] Failed to get display media sources:', error)
        callback({})
      }
    },
    {
      useSystemPicker: true
    }
  )
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'StreamingClassRoom',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.streamingclassroom.app')
  registerHttpBridge()
  registerScreenShareHandler()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})