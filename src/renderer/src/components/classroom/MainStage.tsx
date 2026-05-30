import type { Participant, VideoTrack } from 'livekit-client'
import { TrackVideo } from '../live/TrackVideo'

interface MainStageProps {
  displayName: string
  isLocal?: boolean
  isScreenShare?: boolean
  isTeacher?: boolean
  mainParticipant: Participant | null
  mainVideoTrack?: VideoTrack | null
  presenterCameraTrack?: VideoTrack | null
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .map((part) => part.trim().slice(0, 1))
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

export function MainStage({
  displayName,
  isLocal = false,
  isScreenShare = false,
  isTeacher = false,
  mainParticipant,
  mainVideoTrack,
  presenterCameraTrack
}: MainStageProps): JSX.Element {
  const title = mainParticipant ? displayName : 'Waiting for video'

  return (
    <section
      className={`main-stage${isScreenShare ? ' screen-share-stage' : ''}`}
      aria-label="Main video"
    >
      <div className="main-stage-media">
        {mainVideoTrack ? (
          <TrackVideo
            className="main-stage-video"
            fit={isScreenShare ? 'contain' : 'cover'}
            muted={isLocal}
            track={mainVideoTrack}
          />
        ) : (
          <div className="main-stage-placeholder">
            <div className="main-stage-avatar">{initials(title)}</div>
            <strong>{title}</strong>
            <span>
              {mainParticipant ? 'Camera is off or no video track is published.' : 'Waiting for video'}
            </span>
          </div>
        )}

        {isScreenShare && presenterCameraTrack ? (
          <div className="presenter-camera-tile" aria-label="Presenter camera">
            <TrackVideo
              className="presenter-camera-video"
              fit="cover"
              muted={isLocal}
              track={presenterCameraTrack}
            />
            <span>{displayName}</span>
          </div>
        ) : null}

        <div className="main-stage-overlay">
          <div>
            <strong>{title}</strong>
            <span>{isScreenShare ? 'Screen share' : isLocal ? 'You' : 'Live participant'}</span>
          </div>
          <div className="main-stage-badges">
            {isTeacher ? <span>Teacher</span> : null}
            {isScreenShare ? <span>Sharing</span> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
