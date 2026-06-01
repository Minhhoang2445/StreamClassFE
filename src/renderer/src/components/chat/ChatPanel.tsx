import { useEffect } from 'react'
import { useSessionChat } from '../../hooks/useSessionChat'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { useAuth } from '../../hooks/useAuth'
import type { ChatMessageResponse } from '../../types/chat'

interface ChatPanelProps {
  sessionId: string
  className?: string
  enabled?: boolean
}

export function ChatPanel({ sessionId, className, enabled = true }: ChatPanelProps): JSX.Element {
  const { currentUser } = useAuth()
  const {
    messages,
    connected,
    sending,
    uploadingFile,
    uploadError,
    error,
    sendMessage,
    sendFile,
    downloadFile,
    disconnect
  } = useSessionChat(sessionId, {
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

  const handleSendFile = async (file: File, caption?: string): Promise<void> => {
    await sendFile(file, caption)
  }

  const handleDownloadFile = async (message: ChatMessageResponse): Promise<void> => {
    await downloadFile(message)
  }

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
        {uploadError && <div className="chat-panel-error">{uploadError}</div>}
      </div>

      <ChatMessageList
        messages={messages}
        currentUserId={currentUser?.username}
        onDownloadFile={handleDownloadFile}
      />

      <ChatInput
        onSendText={handleSendMessage}
        onSendFile={handleSendFile}
        disabled={!connected}
        sending={sending}
        uploading={uploadingFile}
      />
    </div>
  )
}
