import { useEffect, useRef, useState } from 'react'
import type { ChatMessageResponse } from '../../types/chat'
import { ChatMessageStatus, ChatMessageType } from '../../types/chat'
import { Role } from '../../types/auth'
import { formatFileSize } from '../../utils/formatFileSize'

interface ChatMessageItemProps {
  message: ChatMessageResponse
  isOwn: boolean
  onDownloadFile: (message: ChatMessageResponse) => Promise<void>
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

function getFileKind(message: ChatMessageResponse): string {
  const fileType = message.fileType?.toLowerCase() ?? ''
  const fileName = message.fileName?.toLowerCase() ?? ''

  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) return 'PDF'
  if (fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(fileName)) return 'IMG'
  if (fileType.includes('word') || /\.(docx?|rtf)$/.test(fileName)) return 'DOC'
  if (fileType.includes('excel') || /\.(xlsx?|csv)$/.test(fileName)) return 'XLS'
  if (fileType.includes('zip') || /\.(zip|rar|7z)$/.test(fileName)) return 'ZIP'
  return 'FILE'
}

export function ChatMessageItem({
  message,
  isOwn,
  onDownloadFile
}: ChatMessageItemProps): JSX.Element {
  const messageRef = useRef<HTMLElement>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (isOwn && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [isOwn])

  const isDeleted = message.status === ChatMessageStatus.Deleted
  const isFileMessage = message.messageType === ChatMessageType.File

  const handleDownload = async (): Promise<void> => {
    setDownloading(true)

    try {
      await onDownloadFile(message)
    } catch (error) {
      console.error('Failed to download file:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article
      ref={messageRef}
      className={`chat-message ${isOwn ? 'chat-message-own' : 'chat-message-other'}`}
    >
      <div className={`chat-message-content ${isFileMessage ? 'chat-message-content-file' : ''}`}>
        <div className="chat-message-header">
          <span className="chat-sender-name">{message.senderUsername}</span>
          {message.senderRole && (
            <span className={`chat-sender-role chat-sender-role-${message.senderRole.toLowerCase()}`}>
              {getRoleDisplay(message.senderRole)}
            </span>
          )}
        </div>
        {isDeleted ? (
          <p className="chat-message-text chat-message-deleted">Tin nhắn đã bị xóa</p>
        ) : isFileMessage ? (
          <div className="chat-file-card">
            <div className="chat-file-icon" aria-hidden="true">
              {getFileKind(message)}
            </div>
            <div className="chat-file-details">
              <span className="chat-file-name">{message.fileName ?? 'File đính kèm'}</span>
              <span className="chat-file-meta">{formatFileSize(message.fileSize)}</span>
              {message.content && <p className="chat-file-caption">{message.content}</p>}
            </div>
            <button
              type="button"
              className="chat-file-download-button"
              onClick={handleDownload}
              disabled={downloading || !message.fileUrl || !message.fileName}
            >
              {downloading ? 'Đang tải...' : 'Download'}
            </button>
          </div>
        ) : (
          <p className="chat-message-text">{message.content}</p>
        )}
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
    </article>
  )
}
