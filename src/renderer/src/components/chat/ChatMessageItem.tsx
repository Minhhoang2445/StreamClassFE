import { useEffect, useRef } from 'react'
import type { ChatMessageResponse } from '../../types/chat'
import { ChatMessageStatus } from '../../types/chat'
import { Role } from '../../types/auth'

interface ChatMessageItemProps {
  message: ChatMessageResponse
  isOwn: boolean
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function getRoleDisplay(role?: Role): string | null {
  if (!role) return null
  switch (role) {
    case Role.Admin:
      return 'Admin'
    case Role.Teacher:
      return 'Teacher'
    case Role.Student:
      return 'Student'
    default:
      return null
  }
}

export function ChatMessageItem({ message, isOwn }: ChatMessageItemProps): JSX.Element {
  const messageRef = useRef<HTMLArticleElement>(null)

  useEffect(() => {
    if (isOwn && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [isOwn])

  const isDeleted = message.status === ChatMessageStatus.Deleted

  return (
    <article
      ref={messageRef}
      className={`chat-message ${isOwn ? 'chat-message-own' : 'chat-message-other'}`}
    >
      <div className="chat-message-content">
        <div className="chat-message-header">
          <span className="chat-sender-name">{message.senderUsername}</span>
          {message.senderRole && (
            <span className={`chat-sender-role chat-sender-role-${message.senderRole.toLowerCase()}`}>
              {getRoleDisplay(message.senderRole)}
            </span>
          )}
        </div>
        <p className={`chat-message-text ${isDeleted ? 'chat-message-deleted' : ''}`}>
          {isDeleted ? 'Tin nhắn đã bị xóa' : message.content}
        </p>
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
    </article>
  )
}
