import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Role } from '../types/auth'

export function AppLayout(): JSX.Element {
  const { logout, role, username } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SC</span>
          <div>
            <strong>StreamingClassRoom</strong>
            <span>Desktop</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/classrooms">Classrooms</NavLink>
          {role === Role.Student ? <NavLink to="/join-classroom">Join by code</NavLink> : null}
          <NavLink to="/profile">Profile</NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <span>{username ?? 'Unknown user'}</span>
            <strong>{role ?? 'NO_ROLE'}</strong>
          </div>
          <button className="button ghost full" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
