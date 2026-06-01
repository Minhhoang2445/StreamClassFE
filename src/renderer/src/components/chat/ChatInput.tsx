import { FormEvent, useState } from 'react'

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>
  disabled?: boolean
  sending?: boolean
}

export function ChatInput({ onSendMessage, disabled = false, sending = false }: ChatInputProps): JSX.Element {
  const [draft, setDraft] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    const content = draft.trim()
    if (!content || disabled || sending) {
      return
    }

    try {
      await onSendMessage(content)
      setDraft('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent<HTMLFormElement>)
    }
  }

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <textarea
        className="chat-input"
        placeholder="Nhập tin nhắn..."
        value={draft}
        onChange={(e) => {
          const value = e.target.value
          if (value.length <= 2000) {
            setDraft(value)
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || sending}
        rows={3}
      />
      <div className="chat-input-footer">
        <span className="chat-input-char-count">
          {draft.length}/2000
        </span>
        <button
          type="submit"
          className="chat-send-button"
          disabled={!draft.trim() || disabled || sending}
        >
          {sending ? 'Đang gửi...' : 'Gửi'}
        </button>
      </div>
    </form>
  )
}
