import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types/auth'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
  children?: JSX.Element
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />
  }

  return children ?? <Outlet />
}
