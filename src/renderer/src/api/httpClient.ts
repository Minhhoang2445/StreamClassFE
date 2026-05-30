import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios'
import { clearStoredToken, getStoredToken } from '../utils/authToken'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

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

export const httpClient = axios.create({
  adapter: electronHttpAdapter,
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})

httpClient.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken()
      window.dispatchEvent(new Event('auth:unauthorized'))
    }

    return Promise.reject(error)
  }
)
