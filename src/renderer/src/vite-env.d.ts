/// <reference types="vite/client" />

interface Window {
  api: {
    platform: NodeJS.Platform
    httpRequest: (payload: {
      url: string
      method: string
      headers?: Record<string, string>
      body?: string
    }) => Promise<{
      data: string
      headers: Record<string, string>
      status: number
      statusText: string
    }>
  }
}
