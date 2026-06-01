import { Role } from './auth'

export enum ChatMessageStatus {
  Sent = 'SENT',
  Deleted = 'DELETED'
}

export enum ChatMessageType {
  Text = 'TEXT',
  File = 'FILE'
}

export interface ChatMessageResponse {
  id: string
  sessionId: string
  senderId: string
  senderUsername: string
  senderRole?: Role
  content?: string
  status: ChatMessageStatus
  messageType: ChatMessageType
  fileName?: string
  fileUrl?: string
  fileType?: string
  fileSize?: number
  createdAt: string
}

export interface SendChatMessageRequest {
  content: string
}
