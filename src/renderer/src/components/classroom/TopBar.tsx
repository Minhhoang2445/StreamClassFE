import { LiveSessionStatus, type LiveSessionResponse } from '../../types/liveSession'
import { ConnectionStatus } from '../live/ConnectionStatus'

interface TopBarProps {
  connectionLabel: string
  durationLabel?: string
  participantCount: number
  roomName?: string
  session: LiveSessionResponse | null
  title: string
}

function statusText(session: LiveSessionResponse | null): string {
  if (session?.status === LiveSessionStatus.Live) {
    return 'LIVE'
  }

  return 'Online Class'
}

export function TopBar({
  connectionLabel,
  durationLabel,
  participantCount,
  roomName,
  session,
  title
}: TopBarProps): JSX.Element {
  return (
    <header className="classroom-topbar">
      <div className="classroom-title-block">
        <span className="classroom-status">{statusText(session)}</span>
        <div>
          <h1>{title}</h1>
          <p>{roomName ? `Room: ${roomName}` : session?.classroomName || 'Live classroom'}</p>
        </div>
      </div>

      <div className="classroom-topbar-meta" aria-label="Room summary">
        <div>
          <span>Participants</span>
          <strong>{participantCount}</strong>
        </div>
        {durationLabel ? (
          <div>
            <span>Duration</span>
            <strong>{durationLabel}</strong>
          </div>
        ) : null}
        <ConnectionStatus status={connectionLabel} />
      </div>
    </header>
  )
}
