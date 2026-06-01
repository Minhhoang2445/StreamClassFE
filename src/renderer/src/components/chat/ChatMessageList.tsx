import { useEffect, useRef } from 'react'
import type { ChatMessageResponse } from '../../types/chat'
import { ChatMessageItem } from './ChatMessageItem'

interface ChatMessageListProps {
  messages: ChatMessageResponse[]
  currentUserId?: string
  onDownloadFile: (message: ChatMessageResponse) => Promise<void>
}

function isOwnMessage(message: ChatMessageResponse, currentUserId?: string): boolean {
  if (!currentUserId) {
    return false
  }

  return message.senderId === currentUserId || message.senderUsername === currentUserId
}

export function ChatMessageList({
  messages,
  currentUserId,
  onDownloadFile
}: ChatMessageListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="chat-message-list" ref={listRef}>
      {messages.length === 0 ? (
        <div className="chat-empty">
          <p>Chưa có tin nhắn nào</p>
        </div>
      ) : (
        messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            isOwn={isOwnMessage(message, currentUserId)}
            onDownloadFile={onDownloadFile}
          />
        ))
      )}
    </div>
  )
}
