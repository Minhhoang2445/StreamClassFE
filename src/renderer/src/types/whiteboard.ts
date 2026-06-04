export type WhiteboardEventType = 'DRAW_START' | 'DRAW_POINTS' | 'DRAW_END' | 'CLEAR'

export type WhiteboardTool = 'PEN' | 'ERASER'

export interface WhiteboardPoint {
  x: number
  y: number
}

export interface WhiteboardEvent {
  type: WhiteboardEventType
  strokeId?: string
  tool?: WhiteboardTool
  color?: string
  lineWidth?: number
  points?: WhiteboardPoint[]
  sessionId?: string
  senderUsername?: string
  timestamp?: number
}
