import type { Role } from './auth'

// No user/profile/list-teachers API exists in the current backend handoff.
export interface UserSummary {
  id: string
  username: string
  role: Role
  createdAt?: string
}
