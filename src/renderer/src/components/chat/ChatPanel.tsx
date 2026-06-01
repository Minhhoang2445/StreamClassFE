import { useEffect, useState } from 'react'
import { useSessionChat } from '../../hooks/useSessionChat'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { useAuth } from '../../hooks/useAuth'

interface ChatPanelProps {
  sessionId: string
  className?: string
  enabled?: boolean
}

export function ChatPanel({ sessionId, className, enabled = true }: ChatPanelProps): JSX.Element {
  const { currentUser } = useAuth()
  const [tabIndex, setTabIndex] = useState(0)
  const { messages, connected, sending, error, sendMessage, disconnect } = useSessionChat(sessionId, {
    enabled
  })

  useEffect(() => {
    return () => {
      if (!enabled) {
        disconnect()
      }
    }
  }, [enabled, disconnect])

  const handleSendMessage = async (content: string): Promise<void> => {
    await sendMessage(content)
  }

  const unreadCount = messages.filter((m) => m.senderId !== currentUser?.username).length

  return (
    <div className={`realtime-chat-panel ${className || ''}`}>
      <div className="chat-panel-header">
        <div className="chat-panel-title-row">
          <h2 className="chat-panel-title">Chat</h2>
          <span className={`chat-status-badge ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● Kết nối' : '○ Mất kết nối'}
          </span>
        </div>
        {error && <div className="chat-panel-error">{error.message}</div>}
      </div>

      <ChatMessageList messages={messages} currentUserId={currentUser?.username} />

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!connected}
        sending={sending}
      />
    </div>
  )
}
