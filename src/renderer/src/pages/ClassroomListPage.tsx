import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteClassroom, listClassrooms } from '../api/classroomApi'
import { PageHeader } from '../components/PageHeader'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { Role } from '../types/auth'
import type { ClassroomResponse } from '../types/classroom'
import { getApiErrorMessage } from '../utils/apiError'

export function ClassroomListPage(): JSX.Element {
  const { role } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomResponse[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadClassrooms = async (): Promise<void> => {
    setIsLoading(true)
    setError('')

    try {
      setClassrooms(await listClassrooms())
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadClassrooms()
  }, [])

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = window.confirm('Xoa classroom nay?')

    if (!confirmed) {
      return
    }

    setDeletingId(id)
    setError('')

    try {
      await deleteClassroom(id)
      setClassrooms((items) => items.filter((item) => item.id !== id))
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Classrooms"
        title="Danh sach lop hoc"
        description={
          role === Role.Student
            ? 'Student chi thay classroom da join active theo backend.'
            : 'Admin va teacher thay tat ca classroom theo backend.'
        }
        actions={
          <>
            {role === Role.Admin ? (
              <Link className="button primary" to="/classrooms/create">
                Tao classroom
              </Link>
            ) : null}
            {role === Role.Student ? (
              <Link className="button secondary" to="/join-classroom">
                Join bang code
              </Link>
            ) : null}
          </>
        }
      />

      {isLoading ? <StatusMessage title="Dang tai classroom..." /> : null}
      {error ? <StatusMessage tone="error" title="Khong tai duoc classroom" message={error} /> : null}

      {!isLoading && !error && classrooms.length === 0 ? (
        <StatusMessage title="Chua co classroom" message="Backend tra ve danh sach rong." />
      ) : null}

      <section className="classroom-grid">
        {classrooms.map((classroom) => (
          <article className="classroom-card" key={classroom.id}>
            <div>
              <span className="eyebrow">{classroom.classCode}</span>
              <h2>{classroom.name}</h2>
              <p>{classroom.description || 'Khong co mo ta.'}</p>
            </div>

            <dl className="meta-grid">
              <div>
                <dt>Teacher</dt>
                <dd>{classroom.teacherUsername}</dd>
              </div>
              <div>
                <dt>Members</dt>
                <dd>{classroom.memberCount}</dd>
              </div>
            </dl>

            <div className="card-actions">
              <Link className="button secondary" to={`/classrooms/${classroom.id}`}>
                Chi tiet
              </Link>
              {role === Role.Admin ? (
                <>
                  <Link className="button ghost" to={`/classrooms/${classroom.id}/edit`}>
                    Sua
                  </Link>
                  <button
                    className="button danger"
                    disabled={deletingId === classroom.id}
                    type="button"
                    onClick={() => void handleDelete(classroom.id)}
                  >
                    {deletingId === classroom.id ? 'Dang xoa...' : 'Xoa'}
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
