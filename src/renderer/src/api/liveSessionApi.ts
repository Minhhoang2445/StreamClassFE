import { httpClient } from './httpClient'
import type {
  CreateLiveSessionRequest,
  LiveSessionResponse,
  LiveSessionTokenResponse,
  UpdateLiveSessionRequest
} from '../types/liveSession'

export async function createLiveSession(
  classroomId: string,
  request: CreateLiveSessionRequest
): Promise<LiveSessionResponse> {
  const response = await httpClient.post<LiveSessionResponse>(
    `/api/classrooms/${classroomId}/sessions`,
    request
  )
  return response.data
}

export async function getSessionsByClassroom(
  classroomId: string
): Promise<LiveSessionResponse[]> {
  const response = await httpClient.get<LiveSessionResponse[]>(
    `/api/classrooms/${classroomId}/sessions`
  )
  return response.data
}

export async function getLiveSessionById(sessionId: string): Promise<LiveSessionResponse> {
  const response = await httpClient.get<LiveSessionResponse>(`/api/sessions/${sessionId}`)
  return response.data
}

export async function updateLiveSession(
  sessionId: string,
  request: UpdateLiveSessionRequest
): Promise<LiveSessionResponse> {
  const response = await httpClient.put<LiveSessionResponse>(
    `/api/sessions/${sessionId}`,
    request
  )
  return response.data
}

export async function deleteLiveSession(sessionId: string): Promise<void> {
  await httpClient.delete(`/api/sessions/${sessionId}`)
}

export async function startSession(sessionId: string): Promise<LiveSessionTokenResponse> {
  const response = await httpClient.post<LiveSessionTokenResponse>(
    `/api/sessions/${sessionId}/start`
  )
  return response.data
}

export async function joinSession(sessionId: string): Promise<LiveSessionTokenResponse> {
  const response = await httpClient.post<LiveSessionTokenResponse>(
    `/api/sessions/${sessionId}/join`
  )
  return response.data
}
