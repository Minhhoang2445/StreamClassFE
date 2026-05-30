import { JwtPayload, Role } from '../types/auth'

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
  )
}

export function decodeJwt(token: string): JwtPayload | null {
  const [, payload] = token.split('.')

  if (!payload) {
    return null
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload
  } catch {
    return null
  }
}

export function normalizeRole(role: string | undefined): Role | null {
  if (!role) {
    return null
  }

  const cleanRole = role.replace(/^ROLE_/, '')

  if (cleanRole === Role.Admin || cleanRole === Role.Teacher || cleanRole === Role.Student) {
    return cleanRole
  }

  return null
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token)

  if (!payload?.exp) {
    return false
  }

  return payload.exp * 1000 <= Date.now()
}
