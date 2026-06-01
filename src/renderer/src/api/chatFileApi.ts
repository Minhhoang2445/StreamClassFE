import { apiBaseUrl, refreshTokens } from './httpClient'
import type { ChatMessageResponse } from '../types/chat'
import { getAccessToken, getRefreshToken } from '../utils/tokenStorage'

function buildApiUrl(pathOrUrl: string): string {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  return new URL(pathOrUrl, apiBaseUrl).toString()
}

async function getLatestAccessToken(): Promise<string> {
  const accessToken = getAccessToken()

  if (accessToken) {
    return accessToken
  }

  if (getRefreshToken()) {
    const tokens = await refreshTokens()
    return tokens.accessToken
  }

  throw new Error('JWT access token not found')
}

function isAuthFailure(response: Response): boolean {
  return response.status === 401 || response.status === 403
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.text()
    if (!body) {
      return `Request failed with status ${response.status}`
    }

    try {
      const json = JSON.parse(body) as { message?: string; error?: string }
      return json.message ?? json.error ?? body
    } catch {
      return body
    }
  } catch {
    return `Request failed with status ${response.status}`
  }
}

async function authorizedFetch(input: string, init: RequestInit, retry = true): Promise<Response> {
  const token = await getLatestAccessToken()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(input, {
    ...init,
    headers
  })

  if (retry && isAuthFailure(response) && getRefreshToken()) {
    const tokens = await refreshTokens()
    headers.set('Authorization', `Bearer ${tokens.accessToken}`)
    return fetch(input, {
      ...init,
      headers
    })
  }

  return response
}

export async function uploadChatFile(
  sessionId: string,
  file: File,
  caption?: string
): Promise<ChatMessageResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const trimmedCaption = caption?.trim()
  if (trimmedCaption) {
    formData.append('caption', trimmedCaption)
  }

  const response = await authorizedFetch(
    buildApiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/messages/files`),
    {
      method: 'POST',
      body: formData
    }
  )

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return (await response.json()) as ChatMessageResponse
}

export async function downloadChatFile(message: ChatMessageResponse): Promise<void> {
  if (!message.fileUrl || !message.fileName) {
    throw new Error('File message is missing download information.')
  }

  const response = await authorizedFetch(buildApiUrl(message.fileUrl), {
    method: 'GET'
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = message.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 1000)
}
