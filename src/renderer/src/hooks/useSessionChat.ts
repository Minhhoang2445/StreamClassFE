import { useCallback, useEffect, useRef, useState } from 'react'
import { Client, Message, StompConfig } from '@stomp/stompjs'
import { getChatMessages } from '../api/chatApi'
import { getStoredToken } from '../utils/authToken'
import type { ChatMessageResponse } from '../types/chat'

function getWebSocketUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

  try {
    const url = new URL(apiBaseUrl)
    const protocol = url.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${url.host}/ws`
  } catch {
    const protocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws'
    return `${protocol}://localhost:8080/ws`
  }
}

interface UseSessionChatOptions {
  enabled?: boolean
}

interface UseSessionChatResult {
  messages: ChatMessageResponse[]
  loading: boolean
  error: Error | null
  connected: boolean
  sending: boolean
  sendMessage: (content: string) => Promise<void>
  disconnect: () => void
}

export function useSessionChat(
  sessionId: string,
  options: UseSessionChatOptions = {}
): UseSessionChatResult {
  const { enabled = true } = options

  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)

  const clientRef = useRef<Client | null>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  useEffect(() => {
    if (!enabled || !sessionId) {
      return
    }

    const loadHistoryAndConnect = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const historyMessages = await getChatMessages(sessionId)
        setMessages(historyMessages)

        const token = getStoredToken()
        if (!token) {
          setError(new Error('JWT token not found'))
          return
        }

        const wsUrl = getWebSocketUrl()
        const config: StompConfig = {
          brokerURL: wsUrl,
          connectHeaders: {
            Authorization: `Bearer ${token}`
          },
          reconnectDelay: 5000,
          onConnect: () => {
            setConnected(true)
            setError(null)

            const topic = `/topic/sessions/${sessionId}/chat`
            subscriptionRef.current = clientRef.current!.subscribe(topic, (msg: Message) => {
              try {
                const receivedMessage = JSON.parse(msg.body) as ChatMessageResponse
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === receivedMessage.id)
                  if (exists) {
                    return prev
                  }
                  return [...prev, receivedMessage]
                })
              } catch (err) {
                console.error('Failed to parse message:', err)
              }
            })
          },
          onStompError: (frame) => {
            console.error('STOMP error:', frame)
            setError(new Error(`STOMP error: ${frame.body}`))
            setConnected(false)
          },
          onWebSocketClose: () => {
            setConnected(false)
          }
        }

        const client = new Client(config)
        clientRef.current = client
        client.activate()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(new Error(`Failed to initialize chat: ${errorMessage}`))
        setConnected(false)
      } finally {
        setLoading(false)
      }
    }

    loadHistoryAndConnect()

    return () => {
      subscriptionRef.current?.unsubscribe()
      if (clientRef.current?.active) {
        clientRef.current.deactivate()
      }
      setConnected(false)
    }
  }, [enabled, sessionId])

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmedContent = content.trim()
      if (!trimmedContent || !connected || !clientRef.current?.active) {
        return
      }

      setSending(true)
      try {
        const destination = `/app/sessions/${sessionId}/chat.send`
        clientRef.current.publish({
          destination,
          body: JSON.stringify({ content: trimmedContent })
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(new Error(`Failed to send message: ${errorMessage}`))
      } finally {
        setSending(false)
      }
    },
    [sessionId, connected]
  )

  const disconnect = useCallback(() => {
    subscriptionRef.current?.unsubscribe()
    if (clientRef.current?.active) {
      clientRef.current.deactivate()
    }
    setConnected(false)
  }, [])

  return {
    messages,
    loading,
    error,
    connected,
    sending,
    sendMessage,
    disconnect
  }
}
