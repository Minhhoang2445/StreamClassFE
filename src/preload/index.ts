import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface HttpRequestPayload {
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
}

interface HttpResponsePayload {
  data: string
  headers: Record<string, string>
  status: number
  statusText: string
}

const api = {
  platform: process.platform,
  httpRequest: (payload: HttpRequestPayload): Promise<HttpResponsePayload> =>
    ipcRenderer.invoke('http:request', payload)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  const unsafeWindow = window as Window &
    typeof globalThis & {
      electron: typeof electronAPI
      api: typeof api
    }
  unsafeWindow.electron = electronAPI
  unsafeWindow.api = api
}
