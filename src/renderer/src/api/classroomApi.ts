import { httpClient } from './httpClient'
import type {
  ClassroomMemberResponse,
  ClassroomResponse,
  CreateClassroomRequest,
  JoinClassroomRequest,
  UpdateClassroomRequest
} from '../types/classroom'

export async function listClassrooms(): Promise<ClassroomResponse[]> {
  const response = await httpClient.get<ClassroomResponse[]>('/api/classrooms')
  return response.data
}

export async function getClassroom(id: string): Promise<ClassroomResponse> {
  const response = await httpClient.get<ClassroomResponse>(`/api/classrooms/${id}`)
  return response.data
}

export async function createClassroom(request: CreateClassroomRequest): Promise<ClassroomResponse> {
  const response = await httpClient.post<ClassroomResponse>('/api/classrooms', request)
  return response.data
}

export async function updateClassroom(
  id: string,
  request: UpdateClassroomRequest
): Promise<ClassroomResponse> {
  const response = await httpClient.put<ClassroomResponse>(`/api/classrooms/${id}`, request)
  return response.data
}

export async function deleteClassroom(id: string): Promise<void> {
  await httpClient.delete(`/api/classrooms/${id}`)
}

export async function joinClassroom(
  request: JoinClassroomRequest
): Promise<ClassroomMemberResponse> {
  const response = await httpClient.post<ClassroomMemberResponse>('/api/classrooms/join', request)
  return response.data
}

export async function listClassroomMembers(id: string): Promise<ClassroomMemberResponse[]> {
  const response = await httpClient.get<ClassroomMemberResponse[]>(`/api/classrooms/${id}/members`)
  return response.data
}
