export enum Role {
  Admin = 'ADMIN',
  Teacher = 'TEACHER',
  Student = 'STUDENT'
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

export interface RegisterRequest {
  username: string
  password: string
  confirmPassword: string
  role: Role
}

export interface AuthUser {
  username: string
  role: Role | null
}

export interface JwtPayload {
  sub?: string
  role?: `ROLE_${Role}` | Role | string
  exp?: number
  iat?: number
}
