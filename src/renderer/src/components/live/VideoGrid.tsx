import type { Participant, Room } from 'livekit-client'
import { MainStage } from './MainStage'
import { ParticipantStrip } from './ParticipantStrip'

interface VideoGridProps {
  displayName?: string
  getIsTeacher?: (participant: Participant) => boolean
  isScreenShare?: boolean
  mainParticipant?: Participant | null
  mainVideoTrack?: Parameters<typeof MainStage>[0]['mainVideoTrack']
  room: Room | null
  remoteParticipants: Participant[]
}

function participantId(participant: Participant | null | undefined): string | undefined {
  return participant ? participant.sid || participant.identity : undefined
}

export function VideoGrid({
  displayName = 'Waiting for video',
  getIsTeacher,
  isScreenShare = false,
  mainParticipant = null,
  mainVideoTrack = null,
  remoteParticipants,
  room
}: VideoGridProps): JSX.Element {
  if (!room) {
    return (
      <section className="live-main-area">
        <MainStage
          displayName="Chua ket noi LiveKit"
          mainParticipant={null}
          mainVideoTrack={null}
        />
      </section>
    )
  }

  const participants = [room.localParticipant, ...remoteParticipants]
  const mainParticipantId = participantId(mainParticipant)

  return (
    <section className="live-main-area">
      <MainStage
        displayName={displayName}
        isLocal={mainParticipant?.isLocal ?? false}
        isScreenShare={isScreenShare}
        isTeacher={mainParticipant ? (getIsTeacher?.(mainParticipant) ?? false) : false}
        mainParticipant={mainParticipant}
        mainVideoTrack={mainVideoTrack}
      />
      <ParticipantStrip
        getIsTeacher={getIsTeacher}
        mainParticipantId={mainParticipantId}
        participants={participants}
      />
    </section>
  )
}
