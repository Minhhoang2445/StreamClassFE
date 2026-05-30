import type { Participant } from 'livekit-client'
import { ParticipantTile } from './ParticipantTile'

interface ParticipantSidebarProps {
  getIsTeacher?: (participant: Participant) => boolean
  mainParticipantId?: string
  participants: Participant[]
}

function participantId(participant: Participant): string {
  return participant.sid || participant.identity
}

export function ParticipantSidebar({
  getIsTeacher,
  mainParticipantId,
  participants
}: ParticipantSidebarProps): JSX.Element {
  return (
    <aside className="participant-sidebar" aria-label="Participants">
      <header className="participant-sidebar-header">
        <div>
          <strong>Participants</strong>
          <span>{participants.length} in room</span>
        </div>
      </header>

      <div className="participant-strip">
        {participants.length > 0 ? (
          participants.map((participant) => {
            const id = participantId(participant)

            return (
              <ParticipantTile
                key={id}
                isOnStage={id === mainParticipantId}
                isTeacher={getIsTeacher?.(participant) ?? false}
                participant={participant}
              />
            )
          })
        ) : (
          <div className="participant-strip-empty">No participants yet.</div>
        )}
      </div>
    </aside>
  )
}
