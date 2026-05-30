import { Link } from 'react-router-dom'

export function NotFoundPage(): JSX.Element {
  return (
    <main className="auth-page">
      <section className="form-card">
        <h1>404</h1>
        <p>Khong tim thay man hinh.</p>
        <Link className="button primary" to="/dashboard">
          Ve dashboard
        </Link>
      </section>
    </main>
  )
}
