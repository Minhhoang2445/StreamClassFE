import { Participant, ParticipantEvent, Track } from 'livekit-client'
import { useEffect, useState } from 'react'
import { TrackAudio } from './TrackAudio'
import { TrackVideo } from './TrackVideo'

interface ParticipantTileProps {
  isOnStage?: boolean
  isTeacher?: boolean
  participant: Participant
  label?: string
}

function participantLabel(participant: Participant, label?: string): string {
  return label || participant.name || participant.identity || 'Participant'
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function ParticipantTile({
  isOnStage = false,
  isTeacher = false,
  label,
  participant
}: ParticipantTileProps): JSX.Element {
  const [renderKey, setRenderKey] = useState(0)

  useEffect(() => {
    const refresh = (): void => {
      setRenderKey((value) => value + 1)
    }

    participant
      .on(ParticipantEvent.TrackSubscribed, refresh)
      .on(ParticipantEvent.TrackUnsubscribed, refresh)
      .on(ParticipantEvent.TrackMuted, refresh)
      .on(ParticipantEvent.TrackUnmuted, refresh)
      .on(ParticipantEvent.LocalTrackPublished, refresh)
      .on(ParticipantEvent.LocalTrackUnpublished, refresh)

    return () => {
      participant
        .off(ParticipantEvent.TrackSubscribed, refresh)
        .off(ParticipantEvent.TrackUnsubscribed, refresh)
        .off(ParticipantEvent.TrackMuted, refresh)
        .off(ParticipantEvent.TrackUnmuted, refresh)
        .off(ParticipantEvent.LocalTrackPublished, refresh)
        .off(ParticipantEvent.LocalTrackUnpublished, refresh)
    }
  }, [participant])

  const cameraPublication = participant.getTrackPublication(Track.Source.Camera)
  const microphonePublication = participant.getTrackPublication(Track.Source.Microphone)
  const videoTrack = cameraPublication?.videoTrack
  const audioTrack = microphonePublication?.audioTrack
  const hasCamera = Boolean(videoTrack && !cameraPublication?.isMuted)
  const hasMic = Boolean(microphonePublication && !microphonePublication.isMuted)
  const displayName = participantLabel(participant, label)

  return (
    <article className={`participant-tile${isOnStage ? ' on-stage' : ''}`}>
      <div className="participant-tile-video">
        {videoTrack && !cameraPublication?.isMuted ? (
          <TrackVideo
            key={`${participant.sid}-camera-${renderKey}`}
            fit="cover"
            muted={participant.isLocal}
            track={videoTrack}
          />
        ) : (
          <div className="participant-avatar">
            <strong>{initials(displayName) || '?'}</strong>
          </div>
        )}
        <div className="participant-name-overlay">
          <strong>{displayName}</strong>
          <span>{participant.isLocal ? 'You' : 'Remote'}</span>
        </div>
      </div>
      {!participant.isLocal && audioTrack && !microphonePublication?.isMuted ? (
        <TrackAudio key={`${participant.sid}-microphone-${renderKey}`} track={audioTrack} />
      ) : null}
      <footer className="participant-tile-footer">
        <span>{hasMic ? 'Mic on' : 'Mic muted'}</span>
        <span>{hasCamera ? 'Camera on' : 'Camera off'}</span>
        {isTeacher ? <span>Teacher</span> : null}
        {isOnStage ? <span>On stage</span> : null}
      </footer>
    </article>
  )
}
