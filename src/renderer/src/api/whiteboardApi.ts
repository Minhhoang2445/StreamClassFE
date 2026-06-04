import { httpClient } from './httpClient'
import type { WhiteboardEvent } from '../types/whiteboard'

export async function fetchWhiteboardEvents(sessionId: string): Promise<WhiteboardEvent[]> {
  const response = await httpClient.get<WhiteboardEvent[]>(
    `/api/sessions/${encodeURIComponent(sessionId)}/whiteboard/events`
  )
  return response.data
}
