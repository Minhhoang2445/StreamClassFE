export enum ClassroomMemberRole {
  Student = 'STUDENT',
  Teacher = 'TEACHER',
  Assistant = 'ASSISTANT'
}

export enum ClassroomMemberStatus {
  Active = 'ACTIVE',
  Pending = 'PENDING',
  Removed = 'REMOVED',
  Blocked = 'BLOCKED'
}

// Response fields are marked as inferred in BACKEND_FRONTEND_HANDOFF.md.
export interface ClassroomResponse {
  id: string
  name: string
  description: string | null
  classCode: string
  teacherId: string
  teacherUsername: string
  createdAt: string
  updatedAt: string | null
  memberCount: number
}

export interface CreateClassroomRequest {
  name: string
  description: string
  teacherId: string
  classCode: string
}

export interface UpdateClassroomRequest {
  name?: string
  description?: string | null
  teacherId?: string
  classCode?: string
}

export interface JoinClassroomRequest {
  classCode: string
}

// Response fields are marked as inferred in BACKEND_FRONTEND_HANDOFF.md.
export interface ClassroomMemberResponse {
  id: string
  userId: string
  username: string
  classroomId: string
  classroomName: string
  role: ClassroomMemberRole
  status: ClassroomMemberStatus
  joinedAt: string
}
