import { Role } from './auth'

export enum ChatMessageStatus {
  Sent = 'SENT',
  Deleted = 'DELETED'
}

export interface ChatMessageResponse {
  id: string
  sessionId: string
  senderId: string
  senderUsername: string
  senderRole?: Role
  content: string
  status: ChatMessageStatus
  createdAt: string
}

export interface SendChatMessageRequest {
  content: string
}
