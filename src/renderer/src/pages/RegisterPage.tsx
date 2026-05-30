import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { register } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import { Role } from '../types/auth'
import { getApiErrorMessage } from '../utils/apiError'

export function RegisterPage(): JSX.Element {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<Role>(Role.Student)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Mat khau xac nhan khong khop.')
      return
    }

    setIsSubmitting(true)

    try {
      await register({ username, password, confirmPassword, role })
      setSuccess('Dang ky thanh cong. Dang chuyen ve Login...')
      setTimeout(() => navigate('/login', { replace: true }), 700)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel narrow">
        <form className="form-card wide" onSubmit={handleSubmit}>
          <span className="eyebrow">Public register endpoint</span>
          <h1>Dang ky tai khoan</h1>
          <p className="form-note">
            Backend hien cho client gui role truc tiep, ke ca ADMIN. UI mac dinh la STUDENT va can than
            khi dung moi truong production.
          </p>

          {error ? <div className="form-error">{error}</div> : null}
          {success ? <div className="form-success">{success}</div> : null}

          <label>
            Username
            <input required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label>
            Confirm password
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value={Role.Student}>STUDENT</option>
              <option value={Role.Teacher}>TEACHER</option>
              <option value={Role.Admin}>ADMIN</option>
            </select>
          </label>

          <button className="button primary full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Dang dang ky...' : 'Dang ky'}
          </button>

          <p className="form-note">
            Da co tai khoan? <Link to="/login">Dang nhap</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
