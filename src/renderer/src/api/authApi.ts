import { httpClient } from './httpClient'
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types/auth'

const LOGIN_PREFIX = 'Login successful '

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await httpClient.post<string>('/api/auth/login', request, {
    responseType: 'text',
    transformResponse: [(data) => data]
  })

  const body = String(response.data)

  if (!body.startsWith(LOGIN_PREFIX)) {
    throw new Error('Backend login response khong dung contract hien tai.')
  }

  return {
    token: body.slice(LOGIN_PREFIX.length).trim()
  }
}

export async function register(request: RegisterRequest): Promise<string> {
  const response = await httpClient.post<string>('/api/auth/register', request, {
    responseType: 'text',
    transformResponse: [(data) => data]
  })

  return String(response.data)
}
