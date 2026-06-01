import { httpClient } from './httpClient'
import type { ChatMessageResponse } from '../types/chat'

export async function getChatMessages(sessionId: string): Promise<ChatMessageResponse[]> {
  const response = await httpClient.get<ChatMessageResponse[]>(
    `/api/sessions/${sessionId}/messages`
  )
  return response.data
}
