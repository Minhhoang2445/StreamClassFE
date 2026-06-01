import { useCallback, useEffect, useRef, useState } from 'react'
import { Client, Message, StompConfig } from '@stomp/stompjs'
import { getChatMessages } from '../api/chatApi'
import { downloadChatFile, uploadChatFile } from '../api/chatFileApi'
import { apiBaseUrl, refreshTokens } from '../api/httpClient'
import { getAccessToken, getRefreshToken } from '../utils/tokenStorage'
import { ChatMessageType, type ChatMessageResponse } from '../types/chat'

const MAX_CHAT_FILE_SIZE_BYTES = 10 * 1024 * 1024

function getWebSocketUrl(): string {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  const url = new URL(apiBaseUrl)
  const protocol = url.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${url.host}/ws`
}

async function ensureAccessToken(): Promise<string> {
  const accessToken = getAccessToken()

  if (accessToken) {
    return accessToken
  }

  if (getRefreshToken()) {
    const tokens = await refreshTokens()
    return tokens.accessToken
  }

  throw new Error('JWT access token not found')
}

function isAuthStompError(frame: { body?: string; headers?: Record<string, string> }): boolean {
  const message = `${frame.headers?.message ?? ''} ${frame.body ?? ''}`.toLowerCase()
  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('jwt') ||
    message.includes('token')
  )
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
  uploadingFile: boolean
  uploadError: string | null
  sendMessage: (content: string) => Promise<void>
  sendFile: (file: File, caption?: string) => Promise<void>
  downloadFile: (message: ChatMessageResponse) => Promise<void>
  disconnect: () => void
}

function normalizeMessage(message: ChatMessageResponse): ChatMessageResponse {
  return {
    ...message,
    messageType: message.messageType ?? ChatMessageType.Text
  }
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
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [reconnectTick, setReconnectTick] = useState(0)

  const clientRef = useRef<Client | null>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  const reconnectingRef = useRef(false)

  useEffect(() => {
    if (!enabled || !sessionId) {
      return
    }

    let cancelled = false

    const cleanupClient = async (): Promise<void> => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null

      const client = clientRef.current
      clientRef.current = null

      if (client?.active) {
        await client.deactivate()
      }

      if (!cancelled) {
        setConnected(false)
      }
    }

    const subscribeToChat = (): void => {
      subscriptionRef.current?.unsubscribe()
      const topic = `/topic/sessions/${sessionId}/chat`
      subscriptionRef.current = clientRef.current!.subscribe(topic, (msg: Message) => {
        try {
          const receivedMessage = JSON.parse(msg.body) as ChatMessageResponse
          const normalizedMessage = normalizeMessage(receivedMessage)
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === normalizedMessage.id)
            if (exists) {
              return prev
            }
            return [...prev, normalizedMessage]
          })
        } catch (err) {
          console.error('Failed to parse message:', err)
        }
      })
    }

    const connectClient = async (): Promise<void> => {
      const token = await ensureAccessToken()
      const wsUrl = getWebSocketUrl()
      let client: Client

      const reconnectWithFreshToken = async (reason: string): Promise<void> => {
        if (reconnectingRef.current || cancelled) {
          return
        }

        reconnectingRef.current = true
        setConnected(false)

        try {
          await cleanupClient()
          await refreshTokens()

          if (!cancelled) {
            await connectClient()
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          setError(new Error(`${reason}: ${errorMessage}`))
        } finally {
          reconnectingRef.current = false
        }
      }

      const config: StompConfig = {
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        beforeConnect: async () => {
          const latestToken = await ensureAccessToken()
          client.connectHeaders = {
            Authorization: `Bearer ${latestToken}`
          }
        },
        onConnect: () => {
          if (cancelled) {
            return
          }

          setConnected(true)
          setError(null)
          subscribeToChat()
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame)
          setConnected(false)

          if (isAuthStompError(frame)) {
            void reconnectWithFreshToken('Chat authentication failed')
            return
          }

          setError(new Error(`STOMP error: ${frame.body}`))
        },
        onWebSocketClose: (event) => {
          setConnected(false)

          if (event.code === 1008) {
            void reconnectWithFreshToken('Chat WebSocket authentication failed')
          }
        }
      }

      client = new Client(config)
      clientRef.current = client
      client.activate()
    }

    const loadHistoryAndConnect = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const historyMessages = await getChatMessages(sessionId)
        const normalizedHistoryMessages = historyMessages.map(normalizeMessage)
        setMessages(normalizedHistoryMessages)
        await connectClient()
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
      cancelled = true
      void cleanupClient()
    }
  }, [enabled, reconnectTick, sessionId])

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmedContent = content.trim()
      if (!trimmedContent || !connected || !clientRef.current?.active) {
        return
      }

      setSending(true)
      try {
        setError(null)
        const destination = `/app/sessions/${sessionId}/chat.send`
        const token = await ensureAccessToken()
        clientRef.current.publish({
          destination,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content: trimmedContent })
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(new Error(`Failed to send message: ${errorMessage}`))

        if (getRefreshToken()) {
          try {
            await refreshTokens()
            setReconnectTick((value) => value + 1)
          } catch {
            // refreshTokens dispatches auth:unauthorized when rotation refresh fails.
          }
        }
      } finally {
        setSending(false)
      }
    },
    [sessionId, connected]
  )

  const sendFile = useCallback(
    async (file: File, caption?: string): Promise<void> => {
      if (!file) {
        return
      }

      if (!connected) {
        setUploadError('Chat chưa kết nối. Vui lòng thử lại sau.')
        return
      }

      if (file.size > MAX_CHAT_FILE_SIZE_BYTES) {
        setUploadError('File vượt quá giới hạn 10 MB.')
        return
      }

      setUploadingFile(true)
      setUploadError(null)

      try {
        const uploadedMessage = normalizeMessage(await uploadChatFile(sessionId, file, caption))
        setMessages((prev) => {
          if (prev.some((message) => message.id === uploadedMessage.id)) {
            return prev
          }

          return [...prev, uploadedMessage]
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        setUploadError(`Không thể gửi file: ${errorMessage}`)
        throw err
      } finally {
        setUploadingFile(false)
      }
    },
    [connected, sessionId]
  )

  const downloadFile = useCallback(async (message: ChatMessageResponse): Promise<void> => {
    setUploadError(null)

    try {
      await downloadChatFile(message)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setUploadError(`Không thể tải file: ${errorMessage}`)
      throw err
    }
  }, [])

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
    uploadingFile,
    uploadError,
    sendMessage,
    sendFile,
    downloadFile,
    disconnect
  }
}
