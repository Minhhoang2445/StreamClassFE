import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios'
import type { AuthResponse } from '../types/auth'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../utils/tokenStorage'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<AuthResponse> | null = null

function appendParams(url: URL, params: InternalAxiosRequestConfig['params']): void {
  if (!params) {
    return
  }

  Object.entries(params as Record<string, string | number | boolean | null | undefined>).forEach(
    ([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  )
}

function headersToRecord(headers: InternalAxiosRequestConfig['headers']): Record<string, string> {
  const normalizedHeaders = AxiosHeaders.from(headers).toJSON()
  const record: Record<string, string> = {}

  Object.entries(normalizedHeaders).forEach(([key, value]) => {
    if (value !== false && value !== null && value !== undefined) {
      record[key] = String(value)
    }
  })

  return record
}

const electronHttpAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig
): Promise<AxiosResponse> => {
  if (!config.baseURL) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  const targetUrl = new URL(config.url ?? '', config.baseURL)
  appendParams(targetUrl, config.params)

  const response = await window.api.httpRequest({
    url: targetUrl.toString(),
    method: (config.method ?? 'GET').toUpperCase(),
    headers: headersToRecord(config.headers),
    body: typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
  })

  const axiosResponse: AxiosResponse = {
    config,
    data: response.data,
    headers: response.headers,
    request: null,
    status: response.status,
    statusText: response.statusText
  }

  const validateStatus = config.validateStatus ?? ((status: number) => status >= 200 && status < 300)

  if (!validateStatus(response.status)) {
    throw new AxiosError(
      `Request failed with status code ${response.status}`,
      response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      axiosResponse
    )
  }

  return axiosResponse
}

function parseAuthResponse(data: string): AuthResponse {
  const body = JSON.parse(data) as Partial<AuthResponse>

  if (!body.accessToken || !body.refreshToken || !body.tokenType) {
    throw new Error('Backend refresh response khong dung contract accessToken/refreshToken.')
  }

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    tokenType: body.tokenType
  }
}

async function requestTokenRefresh(): Promise<AuthResponse> {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('Refresh token not found')
  }

  const targetUrl = new URL('/api/auth/refresh', apiBaseUrl)
  const response = await window.api.httpRequest({
    url: targetUrl.toString(),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  })

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Refresh token failed with status ${response.status}`)
  }

  const tokens = parseAuthResponse(response.data)
  setTokens(tokens.accessToken, tokens.refreshToken)
  window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: tokens.accessToken }))
  return tokens
}

export function refreshTokens(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh()
      .catch((error) => {
        clearTokens()
        window.dispatchEvent(new Event('auth:unauthorized'))
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function rejectAsUnauthorized(error: unknown): Promise<never> {
  clearTokens()
  window.dispatchEvent(new Event('auth:unauthorized'))
  return Promise.reject(error)
}

export const httpClient = axios.create({
  adapter: electronHttpAdapter,
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryAxiosRequestConfig | undefined
    const status = error.response?.status
    const isAuthError = status === 401 || status === 403
    const isAuthEndpoint = originalRequest?.url?.startsWith('/api/auth/')

    if (!isAuthError || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const tokens = await refreshTokens()
      originalRequest.headers = AxiosHeaders.from(originalRequest.headers)
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
      return httpClient(originalRequest)
    } catch (refreshError) {
      return rejectAsUnauthorized(refreshError)
    }
  }
)
