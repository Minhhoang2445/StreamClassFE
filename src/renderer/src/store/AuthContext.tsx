import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import { login as loginApi } from '../api/authApi'
import { AuthUser, LoginRequest } from '../types/auth'
import { clearStoredToken, getStoredToken, setStoredToken } from '../utils/authToken'
import { decodeJwt, isTokenExpired, normalizeRole } from '../utils/jwt'

interface AuthContextValue {
  token: string | null
  currentUser: AuthUser | null
  username: string | null
  role: AuthUser['role']
  isAuthenticated: boolean
  login: (request: LoginRequest) => Promise<void>
  logout: () => void
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
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = getStoredToken()

    if (!storedToken || isTokenExpired(storedToken)) {
      clearStoredToken()
      return null
    }

    return storedToken
  })

  const currentUser = useMemo(() => (token ? userFromToken(token) : null), [token])

  const logout = useCallback(() => {
    clearStoredToken()
    setToken(null)
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    const response = await loginApi(request)
    setStoredToken(response.token)
    setToken(response.token)
  }, [])

  useEffect(() => {
    const handleUnauthorized = (): void => {
      logout()
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      currentUser,
      username: currentUser?.username ?? null,
      role: currentUser?.role ?? null,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [currentUser, login, logout, token]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
