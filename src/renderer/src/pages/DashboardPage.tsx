import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../hooks/useAuth'
import { Role } from '../types/auth'

export function DashboardPage(): JSX.Element {
  const { role, username } = useAuth()

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dashboard"
        title={`Xin chao, ${username ?? 'user'}`}
        description="Cac hanh dong ben duoi duoc hien thi theo role doc tu JWT."
      />

      <section className="dashboard-grid">
        <article className="action-card">
          <h2>Classrooms</h2>
          <p>Xem danh sach classroom ma backend tra ve theo role hien tai.</p>
          <Link className="button primary" to="/classrooms">
            Mo classroom
          </Link>
        </article>

        {role === Role.Admin ? (
          <article className="action-card">
            <h2>Tao classroom</h2>
            <p>Admin co quyen tao, sua va xoa classroom qua CRUD endpoint da implement.</p>
            <Link className="button secondary" to="/classrooms/create">
              Tao lop
            </Link>
          </article>
        ) : null}

        {role === Role.Student ? (
          <article className="action-card">
            <h2>Join bang class code</h2>
            <p>Student join classroom bang endpoint da implement: POST /api/classrooms/join.</p>
            <Link className="button secondary" to="/join-classroom">
              Nhap ma lop
            </Link>
          </article>
        ) : null}

        {role === Role.Teacher || role === Role.Student ? (
          <article className="action-card muted">
            <h2>Live room</h2>
            <p>
              Backend chi co token API partial. Vao phong LiveKit tu classroom detail voi roomName duoc
              nhap o frontend.
            </p>
          </article>
        ) : null}
      </section>
    </div>
  )
}
