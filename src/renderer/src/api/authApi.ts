import { httpClient } from './httpClient'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth'

function normalizeAuthResponse(data: unknown): AuthResponse {
  const body = typeof data === 'string' ? JSON.parse(data) : data

  if (
    !body ||
    typeof body !== 'object' ||
    !('accessToken' in body) ||
    !('refreshToken' in body) ||
    !('tokenType' in body)
  ) {
    throw new Error('Backend auth response khong dung contract accessToken/refreshToken.')
  }

  return body as AuthResponse
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await httpClient.post<unknown>('/api/auth/login', request)
  return normalizeAuthResponse(response.data)
}

export async function logout(refreshToken: string): Promise<void> {
  await httpClient.post('/api/auth/logout', { refreshToken })
}

export async function register(request: RegisterRequest): Promise<string> {
  const response = await httpClient.post<string>('/api/auth/register', request, {
    responseType: 'text',
    transformResponse: [(data) => data]
  })

  return String(response.data)
}
