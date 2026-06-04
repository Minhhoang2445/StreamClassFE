interface ControlBarProps {
  cameraEnabled: boolean
  chatOpen: boolean
  disabled: boolean
  micEnabled: boolean
  onLeave: () => void
  onToggleCamera: () => void
  onToggleChat: () => void
  onToggleMic: () => void
  onToggleParticipants: () => void
  onToggleScreenShare: () => void
  onToggleWhiteboard: () => void
  participantCount: number
  participantsOpen: boolean
  screenShareEnabled: boolean
  screenShareSupported?: boolean
  showScreenShare: boolean
  whiteboardOpen: boolean
}

export function ControlBar({
  cameraEnabled,
  chatOpen,
  disabled,
  micEnabled,
  onLeave,
  onToggleCamera,
  onToggleChat,
  onToggleMic,
  onToggleParticipants,
  onToggleScreenShare,
  onToggleWhiteboard,
  participantCount,
  participantsOpen,
  screenShareEnabled,
  screenShareSupported = true,
  showScreenShare,
  whiteboardOpen
}: ControlBarProps): JSX.Element {
  return (
    <section className="room-controls" aria-label="Room controls">
      <button
        className={`control-button${micEnabled ? ' active' : ''}`}
        disabled={disabled}
        type="button"
        onClick={onToggleMic}
      >
        <span>Microphone</span>
        <strong>{micEnabled ? 'Mute Mic' : 'Unmute Mic'}</strong>
      </button>
      <button
        className={`control-button${cameraEnabled ? ' active' : ''}`}
        disabled={disabled}
        type="button"
        onClick={onToggleCamera}
      >
        <span>Camera</span>
        <strong>{cameraEnabled ? 'Stop Video' : 'Start Video'}</strong>
      </button>
      {showScreenShare ? (
        <button
          className={`control-button share${screenShareEnabled ? ' active' : ''}`}
          disabled={disabled || !screenShareSupported}
          title={screenShareSupported ? 'Share screen' : 'Screen share is not supported here.'}
          type="button"
          onClick={onToggleScreenShare}
        >
          <span>Share</span>
          <strong>{screenShareEnabled ? 'Stop Share' : 'Share Screen'}</strong>
        </button>
      ) : null}
      <button
        className={`control-button whiteboard${whiteboardOpen ? ' active' : ''}`}
        disabled={disabled}
        type="button"
        onClick={onToggleWhiteboard}
      >
        <span>Board</span>
        <strong>{whiteboardOpen ? 'Back Video' : 'Whiteboard'}</strong>
      </button>
      <button
        className={`control-button${chatOpen ? ' active' : ''}`}
        disabled={disabled}
        type="button"
        onClick={onToggleChat}
      >
        <span>Panel</span>
        <strong>Chat</strong>
      </button>
      <button
        className={`control-button${participantsOpen ? ' active' : ''}`}
        disabled={disabled}
        type="button"
        onClick={onToggleParticipants}
      >
        <span>Participants</span>
        <strong>{participantCount}</strong>
      </button>
      <button className="control-button danger" type="button" onClick={onLeave}>
        <span>Room</span>
        <strong>Leave</strong>
      </button>
    </section>
  )
}
