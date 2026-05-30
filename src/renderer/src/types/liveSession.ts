export enum LiveSessionStatus {
  Scheduled = 'SCHEDULED',
  Live = 'LIVE',
  Ended = 'ENDED',
  Cancelled = 'CANCELLED'
}

export interface CreateLiveSessionRequest {
  title: string
  description?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  emptyTimeoutSeconds?: number | null
  departureTimeoutSeconds?: number | null
  maxParticipants?: number | null
}

export interface UpdateLiveSessionRequest {
  title?: string | null
  description?: string | null
  status?: LiveSessionStatus | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  emptyTimeoutSeconds?: number | null
  departureTimeoutSeconds?: number | null
  maxParticipants?: number | null
}

export interface LiveSessionResponse {
  id: string
  classroomId: string
  classroomName: string
  hostId: string
  hostUsername: string
  title: string
  description: string | null
  status: LiveSessionStatus
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  actualStartTime: string | null
  actualEndTime: string | null
  livekitRoomName: string | null
  livekitRoomSid: string | null
  emptyTimeoutSeconds: number | null
  departureTimeoutSeconds: number | null
  maxParticipants: number | null
  roomMetadata: string | null
  createdAt: string
  updatedAt: string | null
}

export interface LiveSessionTokenResponse {
  sessionId: string
  classroomId: string
  roomName: string
  livekitUrl: string
  token: string
  identity: string
  username: string
  status: LiveSessionStatus
}
