import type { Client } from '@stomp/stompjs'
import { useWhiteboard } from '../../hooks/useWhiteboard'
import type { WhiteboardEvent } from '../../types/whiteboard'

interface WhiteboardCanvasProps {
  sessionId: string
  stompClient: Client | null
  currentUsername?: string
  enabled: boolean
  stompConnected?: boolean
  connectionKey?: number
  onClose?: () => void
  onRemoteEvent?: (event: WhiteboardEvent) => void
}

export function WhiteboardCanvas({
  sessionId,
  stompClient,
  currentUsername,
  enabled,
  stompConnected,
  connectionKey,
  onClose,
  onRemoteEvent
}: WhiteboardCanvasProps): JSX.Element {
  const {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    lineWidth,
    setLineWidth,
    clearBoard,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    loading,
    error,
    subscribed,
    canDraw
  } = useWhiteboard({
    sessionId,
    stompClient,
    currentUsername,
    enabled,
    stompConnected,
    connectionKey,
    onRemoteEvent
  })

  const handleClear = (): void => {
    if (window.confirm('Clear whiteboard for everyone?')) {
      clearBoard()
    }
  }

  return (
    <section className="whiteboard-stage" aria-label="Collaborative whiteboard">
      <div className="whiteboard-shell">
        <div className="whiteboard-toolbar" aria-label="Whiteboard tools">
          <div className="whiteboard-tool-group">
            <button
              className={`whiteboard-tool${tool === 'PEN' ? ' active' : ''}`}
              disabled={!enabled}
              type="button"
              onClick={() => setTool('PEN')}
            >
              Pen
            </button>
            <button
              className={`whiteboard-tool${tool === 'ERASER' ? ' active' : ''}`}
              disabled={!enabled}
              type="button"
              onClick={() => setTool('ERASER')}
            >
              Eraser
            </button>
          </div>

          <label className="whiteboard-color-control">
            <span>Color</span>
            <input
              aria-label="Whiteboard color"
              disabled={!enabled || tool === 'ERASER'}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>

          <label className="whiteboard-line-control">
            <span>Width</span>
            <input
              aria-label="Whiteboard line width"
              disabled={!enabled}
              max={32}
              min={2}
              step={1}
              type="range"
              value={lineWidth}
              onChange={(event) => setLineWidth(Number(event.target.value))}
            />
            <strong>{lineWidth}px</strong>
          </label>

          <button
            className="whiteboard-tool danger"
            disabled={!canDraw}
            type="button"
            onClick={handleClear}
          >
            Clear
          </button>

          {onClose ? (
            <button className="whiteboard-tool" type="button" onClick={onClose}>
              Back to video
            </button>
          ) : null}
        </div>

        <canvas
          ref={canvasRef}
          aria-label="Whiteboard drawing surface"
          className={`whiteboard-canvas${canDraw ? '' : ' disabled'}`}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerLeave}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {loading || error || !subscribed ? (
          <div className={`whiteboard-status${error ? ' error' : ''}`}>
            {error ?? (loading ? 'Loading whiteboard...' : 'Connecting whiteboard...')}
          </div>
        ) : null}
      </div>
    </section>
  )
}
