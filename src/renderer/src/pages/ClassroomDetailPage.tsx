import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getClassroom, listClassroomMembers } from '../api/classroomApi'
import {
  getSessionsByClassroom,
  joinSession,
  startSession
} from '../api/liveSessionApi'
import { PageHeader } from '../components/PageHeader'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { Role } from '../types/auth'
import type { ClassroomMemberResponse, ClassroomResponse } from '../types/classroom'
import type { LiveSessionResponse } from '../types/liveSession'
import { LiveSessionStatus } from '../types/liveSession'
import { getApiErrorMessage } from '../utils/apiError'

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

export function ClassroomDetailPage(): JSX.Element {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [classroom, setClassroom] = useState<ClassroomResponse | null>(null)
  const [members, setMembers] = useState<ClassroomMemberResponse[]>([])
  const [sessions, setSessions] = useState<LiveSessionResponse[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [liveActionSessionId, setLiveActionSessionId] = useState<string | null>(null)

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!id) {
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const [classroomData, memberData, sessionData] = await Promise.all([
          getClassroom(id),
          listClassroomMembers(id),
          getSessionsByClassroom(id)
        ])
        setClassroom(classroomData)
        setMembers(memberData)
        setSessions(sessionData)
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [id])

  const handleLiveAction = async (session: LiveSessionResponse): Promise<void> => {
    setLiveActionSessionId(session.id)
    setError('')

    try {
      const tokenResponse =
        session.status === LiveSessionStatus.Live
          ? await joinSession(session.id)
          : await startSession(session.id)

      navigate(`/live/${session.id}`, {
        state: {
          tokenResponse,
          returnTo: `/classrooms/${session.classroomId}`
        }
      })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLiveActionSessionId(null)
    }
  }

  const canStartSession = (session: LiveSessionResponse): boolean =>
    // TODO(backend): handoff says start currently only blocks LIVE, not ENDED/CANCELLED.
    // UI follows the stated role rule "session chua LIVE" until backend defines stricter lifecycle rules.
    (role === Role.Admin || role === Role.Teacher) && session.status !== LiveSessionStatus.Live

  const canJoinSession = (session: LiveSessionResponse): boolean =>
    session.status === LiveSessionStatus.Live &&
    (role === Role.Student || role === Role.Teacher || role === Role.Admin)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Classroom detail"
        title={classroom?.name ?? 'Classroom'}
        description="Chi tiet classroom va danh sach member tu backend."
        actions={
          role === Role.Admin && classroom ? (
            <Link className="button secondary" to={`/classrooms/${classroom.id}/edit`}>
              Sua classroom
            </Link>
          ) : null
        }
      />

      {isLoading ? <StatusMessage title="Dang tai classroom..." /> : null}
      {error ? <StatusMessage tone="error" title="Khong tai duoc classroom" message={error} /> : null}

      {classroom ? (
        <>
          <section className="detail-grid">
            <article className="panel">
              <h2>Thong tin lop</h2>
              <dl className="detail-list">
                <div>
                  <dt>Name</dt>
                  <dd>{classroom.name}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{classroom.description || '-'}</dd>
                </div>
                <div>
                  <dt>Class code</dt>
                  <dd>{classroom.classCode}</dd>
                </div>
                <div>
                  <dt>Teacher</dt>
                  <dd>
                    {classroom.teacherUsername} ({classroom.teacherId})
                  </dd>
                </div>
                <div>
                  <dt>Member count</dt>
                  <dd>{classroom.memberCount}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(classroom.createdAt)}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(classroom.updatedAt)}</dd>
                </div>
              </dl>
            </article>

            <article className="panel">
              <h2>Live session contract</h2>
              <dl className="detail-list">
                <div>
                  <dt>Token flow</dt>
                  <dd>Backend start/join tra livekitUrl + token</dd>
                </div>
                <div>
                  <dt>Frontend</dt>
                  <dd>Chi connect LiveKit client SDK, khong generate token</dd>
                </div>
                <div>
                  <dt>Webhook</dt>
                  <dd>Server-to-server, frontend khong goi</dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="panel">
            <h2>Live sessions</h2>
            {sessions.length === 0 ? (
              <StatusMessage
                title="Chua co live session"
                message="Hay tao session bang endpoint create/session management khi backend UI san sang."
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Schedule</th>
                      <th>Host</th>
                      <th>LiveKit room</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <strong>{session.title}</strong>
                          <span className="table-subtext">{session.description || '-'}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${session.status.toLowerCase()}`}>
                            {session.status}
                          </span>
                        </td>
                        <td>{formatDate(session.scheduledStartTime)}</td>
                        <td>{session.hostUsername}</td>
                        <td>{session.livekitRoomName || '-'}</td>
                        <td>
                          {canStartSession(session) ? (
                            <button
                              className="button primary"
                              disabled={liveActionSessionId === session.id}
                              type="button"
                              onClick={() => void handleLiveAction(session)}
                            >
                              {liveActionSessionId === session.id ? 'Dang start...' : 'Start'}
                            </button>
                          ) : null}
                          {canJoinSession(session) ? (
                            <button
                              className="button secondary"
                              disabled={liveActionSessionId === session.id}
                              type="button"
                              onClick={() => void handleLiveAction(session)}
                            >
                              {liveActionSessionId === session.id ? 'Dang join...' : 'Join'}
                            </button>
                          ) : null}
                          {!canStartSession(session) && !canJoinSession(session) ? '-' : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(role === Role.Teacher || role === Role.Admin) &&
            sessions.some((session) => session.status === LiveSessionStatus.Live) ? (
              <p className="panel-note">
                TODO backend: handoff hien ghi /join chi cho STUDENT. UI da goi joinSession cho
                TEACHER/ADMIN khi session LIVE de reconnect hoat dong sau khi backend mo quyen.
              </p>
            ) : null}
          </section>

          <section className="panel">
            <h2>Members</h2>
            {members.length === 0 ? (
              <StatusMessage title="Chua co member" message="Backend tra ve danh sach rong." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>{member.username}</td>
                        <td>{member.role}</td>
                        <td>{member.status}</td>
                        <td>{formatDate(member.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
