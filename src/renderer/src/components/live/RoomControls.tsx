interface RoomControlsProps {
  cameraEnabled: boolean
  disabled: boolean
  micEnabled: boolean
  onLeave: () => void
  onToggleScreenShare: () => void
  onToggleCamera: () => void
  onToggleMic: () => void
  participantCount: number
  screenShareEnabled: boolean
  screenShareSupported?: boolean
}

export function RoomControls({
  cameraEnabled,
  disabled,
  micEnabled,
  onLeave,
  onToggleScreenShare,
  onToggleCamera,
  onToggleMic,
  participantCount,
  screenShareEnabled,
  screenShareSupported = true
}: RoomControlsProps): JSX.Element {
  return (
    <section className="room-controls" aria-label="Room controls">
      <button
        className={`control-button${micEnabled ? ' active' : ''}`}
        disabled={disabled}
        type="button"
        onClick={onToggleMic}
      >
        <span>Microphone</span>
        <strong>{micEnabled ? 'Mic On' : 'Mic Off'}</strong>
      </button>
      <button
        className={`control-button${cameraEnabled ? ' active' : ''}`}
        disabled={disabled}
        type="button"
        onClick={onToggleCamera}
      >
        <span>Camera</span>
        <strong>{cameraEnabled ? 'Camera On' : 'Camera Off'}</strong>
      </button>
      <button
        className={`control-button${screenShareEnabled ? ' active' : ''}`}
        disabled={disabled || !screenShareSupported}
        title={
          screenShareSupported
            ? 'Share screen'
            : 'TODO: implement screen share when LiveKit frontend API is available.'
        }
        type="button"
        onClick={onToggleScreenShare}
      >
        <span>Share</span>
        <strong>{screenShareEnabled ? 'Stop Share' : 'Share Screen'}</strong>
      </button>
      <div className="control-button participant-count" aria-label="Participant count">
        <span>Participants</span>
        <strong>{participantCount}</strong>
      </div>
      <button className="control-button danger" type="button" onClick={onLeave}>
        <span>Room</span>
        <strong>Leave</strong>
      </button>
    </section>
  )
}
