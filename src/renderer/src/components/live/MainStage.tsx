import type { Participant, VideoTrack } from 'livekit-client'
import { TrackVideo } from './TrackVideo'

interface MainStageProps {
  displayName: string
  isLocal?: boolean
  isScreenShare?: boolean
  isTeacher?: boolean
  mainParticipant: Participant | null
  mainVideoTrack?: VideoTrack | null
}

export function MainStage({
  displayName,
  isLocal = false,
  isScreenShare = false,
  isTeacher = false,
  mainParticipant,
  mainVideoTrack
}: MainStageProps): JSX.Element {
  const title = mainParticipant ? displayName : 'Waiting for video'

  return (
    <section className="main-stage" aria-label="Main video">
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
            <div className="main-stage-avatar">{title.slice(0, 1).toUpperCase()}</div>
            <strong>{title}</strong>
            <span>
              {mainParticipant ? 'Camera dang tat hoac chua co video track.' : 'Waiting for video'}
            </span>
          </div>
        )}

        <div className="main-stage-overlay">
          <div>
            <strong>{title}</strong>
            <span>{isLocal ? 'You' : 'Live participant'}</span>
          </div>
          <div className="main-stage-badges">
            {isTeacher ? <span>Teacher</span> : null}
            {isScreenShare ? <span>Screen sharing</span> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
