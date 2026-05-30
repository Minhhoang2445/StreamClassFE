import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getApiErrorMessage } from '../utils/apiError'

interface LocationState {
  from?: {
    pathname?: string
  }
}

export function LoginPage(): JSX.Element {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ username, password })
      navigate(state?.from?.pathname ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <span className="eyebrow">StreamingClassRoom</span>
          <h1>Dang nhap lop hoc truc tuyen</h1>
          <p>Ket noi backend Spring Boot, quan ly classroom va vao phong LiveKit bang token tu server.</p>
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <h2>Login</h2>
          {error ? <div className="form-error">{error}</div> : null}

          <label>
            Username
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button className="button primary full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Dang dang nhap...' : 'Dang nhap'}
          </button>

          <p className="form-note">
            Chua co tai khoan? <Link to="/register">Dang ky</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
