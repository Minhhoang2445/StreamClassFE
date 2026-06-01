import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import { refreshTokens } from '../api/httpClient'
import { login as loginApi, logout as logoutApi } from '../api/authApi'
import { AuthUser, LoginRequest } from '../types/auth'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../utils/tokenStorage'
import { decodeJwt, normalizeRole } from '../utils/jwt'

interface AuthContextValue {
  token: string | null
  currentUser: AuthUser | null
  username: string | null
  role: AuthUser['role']
  isAuthenticated: boolean
  login: (request: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwt(token)

  if (!payload?.sub) {
    return null
  }

  return {
    username: payload.sub,
    role: normalizeRole(payload.role)
  }
}

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const [hasRefreshToken, setHasRefreshToken] = useState(() => Boolean(getRefreshToken()))

  const currentUser = useMemo(() => (token ? userFromToken(token) : null), [token])

  const clearAuthState = useCallback(() => {
    clearTokens()
    setToken(null)
    setHasRefreshToken(false)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()

    try {
      if (refreshToken) {
        await logoutApi(refreshToken)
      }
    } catch (error) {
      console.warn('Logout request failed, clearing local auth state anyway:', error)
    } finally {
      clearAuthState()
    }
  }, [clearAuthState])

  const login = useCallback(async (request: LoginRequest) => {
    const response = await loginApi(request)
    setTokens(response.accessToken, response.refreshToken)
    setToken(response.accessToken)
    setHasRefreshToken(true)
  }, [])

  useEffect(() => {
    const handleUnauthorized = (): void => {
      clearAuthState()
    }

    const handleTokenRefreshed = (event: Event): void => {
      const refreshedToken = (event as CustomEvent<string>).detail ?? getAccessToken()
      setToken(refreshedToken)
      setHasRefreshToken(Boolean(getRefreshToken()))
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed)
    }
  }, [clearAuthState])

  useEffect(() => {
    if (token || !hasRefreshToken) {
      return
    }

    let cancelled = false

    refreshTokens()
      .then((response) => {
        if (!cancelled) {
          setToken(response.accessToken)
          setHasRefreshToken(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthState()
        }
      })

    return () => {
      cancelled = true
    }
  }, [clearAuthState, hasRefreshToken, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      currentUser,
      username: currentUser?.username ?? null,
      role: currentUser?.role ?? null,
      isAuthenticated: Boolean(token || hasRefreshToken),
      login,
      logout
    }),
    [currentUser, hasRefreshToken, login, logout, token]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
