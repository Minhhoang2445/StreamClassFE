const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const LEGACY_TOKEN_KEYS = ['streamingClassRoom.accessToken', 'token', 'jwt', 'authToken']

function migrateLegacyAccessToken(): string | null {
  const currentToken = localStorage.getItem(ACCESS_TOKEN_KEY)

  if (currentToken) {
    return currentToken
  }

  const legacyToken = LEGACY_TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)

  if (legacyToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, legacyToken)
  }

  LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key))
  return legacyToken ?? null
}

export function getAccessToken(): string | null {
  return migrateLegacyAccessToken()
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key))
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key))
}
