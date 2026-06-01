import { FormEvent, KeyboardEvent, useRef, useState } from 'react'
import { formatFileSize } from '../../utils/formatFileSize'

interface ChatInputProps {
  onSendText: (content: string) => Promise<void>
  onSendFile: (file: File, caption?: string) => Promise<void>
  disabled?: boolean
  sending?: boolean
  uploading?: boolean
}

export function ChatInput({
  onSendText,
  onSendFile,
  disabled = false,
  sending = false,
  uploading = false
}: ChatInputProps): JSX.Element {
  const [draft, setDraft] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const busy = sending || uploading

  const clearSelectedFile = (): void => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    const content = draft.trim()
    if ((!content && !selectedFile) || disabled || busy) {
      return
    }

    try {
      if (selectedFile) {
        await onSendFile(selectedFile, content || undefined)
        clearSelectedFile()
      } else {
        await onSendText(content)
      }
      setDraft('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        className="chat-file-input"
        type="file"
        onChange={(e) => {
          setSelectedFile(e.target.files?.[0] ?? null)
        }}
        disabled={disabled || busy}
      />
      {selectedFile && (
        <div className="chat-selected-file">
          <span className="chat-selected-file-icon">FILE</span>
          <div className="chat-selected-file-info">
            <span className="chat-selected-file-name">{selectedFile.name}</span>
            <span className="chat-selected-file-size">{formatFileSize(selectedFile.size)}</span>
          </div>
          <button
            type="button"
            className="chat-remove-file-button"
            aria-label="Xóa file đã chọn"
            onClick={clearSelectedFile}
            disabled={disabled || busy}
          >
            ×
          </button>
        </div>
      )}
      <textarea
        className="chat-input"
        placeholder={selectedFile ? 'Nhập caption...' : 'Nhập tin nhắn...'}
        value={draft}
        onChange={(e) => {
          const value = e.target.value
          if (value.length <= 2000) {
            setDraft(value)
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || busy}
        rows={3}
      />
      <div className="chat-input-footer">
        <span className="chat-input-char-count">
          {draft.length}/2000
        </span>
        <div className="chat-input-actions">
          <button
            type="button"
            className="chat-attach-button"
            aria-label="Chọn file"
            title="Chọn file"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || busy}
          >
            📎
          </button>
          <button
            type="submit"
            className="chat-send-button"
            disabled={(!draft.trim() && !selectedFile) || disabled || busy}
          >
            {uploading ? 'Uploading...' : sending ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </div>
    </form>
  )
}
