import { FormEvent, useMemo, useState } from 'react'

export interface ClassroomChatMessage {
  id: string
  senderIdentity: string
  senderName: string
  sentAt: string
  text: string
}

interface ChatPanelProps {
  currentIdentity?: string
  disabled?: boolean
  messages: ClassroomChatMessage[]
  onClose: () => void
  onSendMessage?: (text: string) => Promise<void> | void
}

function timeLabel(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatPanel({
  currentIdentity,
  disabled = false,
  messages,
  onClose,
  onSendMessage
}: ChatPanelProps): JSX.Element {
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const canSend = useMemo(
    () => Boolean(onSendMessage && draft.trim() && !disabled && !isSending),
    [disabled, draft, isSending, onSendMessage]
  )

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!canSend || !onSendMessage) {
      return
    }

    const text = draft.trim()
    setIsSending(true)

    try {
      await onSendMessage(text)
      setDraft('')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <aside className="chat-panel" aria-label="Class chat">
      <header className="chat-panel-header">
        <div>
          <strong>Class Chat</strong>
          <span>{messages.length} messages</span>
        </div>
        <button aria-label="Close chat" type="button" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="chat-message-list">
        {messages.length > 0 ? (
          messages.map((message) => {
            const isMine = currentIdentity === message.senderIdentity

            return (
              <article
                key={message.id}
                className={`chat-message${isMine ? ' mine' : ''}`}
                aria-label={`Message from ${message.senderName}`}
              >
                <div className="chat-message-meta">
                  <strong>{isMine ? 'You' : message.senderName}</strong>
                  <span>{timeLabel(message.sentAt)}</span>
                </div>
                <p>{message.text}</p>
              </article>
            )
          })
        ) : (
          <div className="chat-empty-state">No messages yet.</div>
        )}
      </div>

      <form className="chat-compose" onSubmit={(event) => void submit(event)}>
        <input
          disabled={disabled || !onSendMessage}
          placeholder="Message class"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button disabled={!canSend} type="submit">
          Send
        </button>
      </form>
    </aside>
  )
}
