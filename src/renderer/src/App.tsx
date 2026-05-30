import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { ClassroomDetailPage } from './pages/ClassroomDetailPage'
import { ClassroomFormPage } from './pages/ClassroomFormPage'
import { ClassroomListPage } from './pages/ClassroomListPage'
import { DashboardPage } from './pages/DashboardPage'
import { JoinClassroomPage } from './pages/JoinClassroomPage'
import { LiveRoomPage } from './pages/LiveRoomPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'
import { Role } from './types/auth'

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/classrooms" element={<ClassroomListPage />} />
        <Route path="/classrooms/:id" element={<ClassroomDetailPage />} />
        <Route
          path="/classrooms/create"
          element={
            <ProtectedRoute allowedRoles={[Role.Admin]}>
              <ClassroomFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classrooms/:id/edit"
          element={
            <ProtectedRoute allowedRoles={[Role.Admin]}>
              <ClassroomFormPage mode="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join-classroom"
          element={
            <ProtectedRoute allowedRoles={[Role.Student]}>
              <JoinClassroomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live/:sessionId"
          element={
            <ProtectedRoute allowedRoles={[Role.Admin, Role.Teacher, Role.Student]}>
              <LiveRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PlaceholderPage
              title="Profile"
              message="User profile API chua duoc backend implement, nen man hinh nay chi la placeholder."
            />
          }
        />
        <Route
          path="/sessions"
          element={
            <PlaceholderPage
              title="Live sessions"
              message="LiveSession CRUD/start/join/end APIs chua duoc backend implement."
            />
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
