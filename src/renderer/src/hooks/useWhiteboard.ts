import { useCallback, useEffect, useRef, useState } from 'react'
import type { Client, IMessage, StompSubscription } from '@stomp/stompjs'
import { fetchWhiteboardEvents } from '../api/whiteboardApi'
import { refreshTokens } from '../api/httpClient'
import type { WhiteboardEvent, WhiteboardPoint, WhiteboardTool } from '../types/whiteboard'
import { getAccessToken, getRefreshToken } from '../utils/tokenStorage'

interface UseWhiteboardOptions {
  sessionId: string
  stompClient: Client | null
  currentUsername?: string
  enabled: boolean
  stompConnected?: boolean
  connectionKey?: number
  onRemoteEvent?: (event: WhiteboardEvent) => void
}

interface UseWhiteboardResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  tool: WhiteboardTool
  setTool: React.Dispatch<React.SetStateAction<WhiteboardTool>>
  color: string
  setColor: React.Dispatch<React.SetStateAction<string>>
  lineWidth: number
  setLineWidth: React.Dispatch<React.SetStateAction<number>>
  clearBoard: () => void
  loadWhiteboardEvents: () => Promise<void>
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void
  handlePointerLeave: (event: React.PointerEvent<HTMLCanvasElement>) => void
  loading: boolean
  error: string | null
  subscribed: boolean
  canDraw: boolean
}

interface StrokeState {
  tool: WhiteboardTool
  color: string
  lineWidth: number
  lastPoint?: WhiteboardPoint
}

const DRAW_POINTS_THROTTLE_MS = 30
const MIN_POINT_DISTANCE = 0.002
const DEFAULT_COLOR = '#111827'
const DEFAULT_LINE_WIDTH = 4

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function pointDistance(a: WhiteboardPoint, b: WhiteboardPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function eventKey(event: WhiteboardEvent): string {
  return JSON.stringify({
    type: event.type,
    strokeId: event.strokeId ?? '',
    senderUsername: event.senderUsername ?? '',
    timestamp: event.timestamp ?? '',
    points: event.points ?? []
  })
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

function isDrawableEvent(event: WhiteboardEvent): boolean {
  return (
    event.type === 'DRAW_START' ||
    event.type === 'DRAW_POINTS' ||
    event.type === 'DRAW_END' ||
    event.type === 'CLEAR'
  )
}

export function useWhiteboard({
  sessionId,
  stompClient,
  currentUsername,
  enabled,
  stompConnected = Boolean(stompClient?.connected),
  connectionKey = 0,
  onRemoteEvent
}: UseWhiteboardOptions): UseWhiteboardResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const remoteStrokesRef = useRef(new Map<string, StrokeState>())
  const historyRef = useRef<WhiteboardEvent[]>([])
  const seenEventsRef = useRef(new Set<string>())
  const pendingRealtimeEventsRef = useRef<WhiteboardEvent[]>([])
  const loadingInitialRef = useRef(false)

  const isDrawingRef = useRef(false)
  const currentStrokeIdRef = useRef<string | null>(null)
  const lastLocalPointRef = useRef<WhiteboardPoint | null>(null)
  const pointsBufferRef = useRef<WhiteboardPoint[]>([])
  const flushTimerRef = useRef<number | null>(null)
  const lastFlushAtRef = useRef(0)

  const [tool, setTool] = useState<WhiteboardTool>('PEN')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [lineWidth, setLineWidth] = useState(DEFAULT_LINE_WIDTH)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)

  const canDraw = enabled && subscribed && stompConnected && Boolean(stompClient?.connected)

  const getCanvasPoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): WhiteboardPoint | null => {
      const canvas = canvasRef.current

      if (!canvas) {
        return null
      }

      const rect = canvas.getBoundingClientRect()

      if (rect.width <= 0 || rect.height <= 0) {
        return null
      }

      return {
        x: clamp01((event.clientX - rect.left) / rect.width),
        y: clamp01((event.clientY - rect.top) / rect.height)
      }
    },
    []
  )

  const pointToCanvasPixels = useCallback((point: WhiteboardPoint): WhiteboardPoint | null => {
    const canvas = canvasRef.current

    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()

    if (rect.width <= 0 || rect.height <= 0) {
      return null
    }

    return {
      x: point.x * rect.width,
      y: point.y * rect.height
    }
  }, [])

  const clearCanvas = useCallback((): void => {
    const canvas = canvasRef.current
    const context = contextRef.current

    if (!canvas || !context) {
      return
    }

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()
  }, [])

  const drawPoint = useCallback(
    (point: WhiteboardPoint, stroke: StrokeState): void => {
      const context = contextRef.current
      const canvasPoint = pointToCanvasPixels(point)

      if (!context || !canvasPoint) {
        return
      }

      context.save()
      context.globalCompositeOperation = stroke.tool === 'ERASER' ? 'destination-out' : 'source-over'
      context.fillStyle = stroke.color
      context.beginPath()
      context.arc(canvasPoint.x, canvasPoint.y, stroke.lineWidth / 2, 0, Math.PI * 2)
      context.fill()
      context.restore()
    },
    [pointToCanvasPixels]
  )

  const drawSegment = useCallback(
    (from: WhiteboardPoint, to: WhiteboardPoint, stroke: StrokeState): void => {
      const context = contextRef.current
      const fromCanvas = pointToCanvasPixels(from)
      const toCanvas = pointToCanvasPixels(to)

      if (!context || !fromCanvas || !toCanvas) {
        return
      }

      context.save()
      context.globalCompositeOperation = stroke.tool === 'ERASER' ? 'destination-out' : 'source-over'
      context.strokeStyle = stroke.color
      context.lineWidth = stroke.lineWidth
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      context.moveTo(fromCanvas.x, fromCanvas.y)
      context.lineTo(toCanvas.x, toCanvas.y)
      context.stroke()
      context.restore()
    },
    [pointToCanvasPixels]
  )

  const rememberEvent = useCallback((event: WhiteboardEvent, dedupe = true): boolean => {
    const key = eventKey(event)

    if (dedupe && seenEventsRef.current.has(key)) {
      return false
    }

    seenEventsRef.current.add(key)
    historyRef.current.push(event)
    return true
  }, [])

  const applyWhiteboardEvent = useCallback(
    (event: WhiteboardEvent, record = false): void => {
      if (!isDrawableEvent(event)) {
        return
      }

      if (record && !rememberEvent(event)) {
        return
      }

      if (event.type === 'CLEAR') {
        clearCanvas()
        remoteStrokesRef.current.clear()
        return
      }

      const strokeId = event.strokeId

      if (!strokeId) {
        return
      }

      if (event.type === 'DRAW_START') {
        const point = event.points?.[0]
        const stroke: StrokeState = {
          tool: event.tool ?? 'PEN',
          color: event.color ?? DEFAULT_COLOR,
          lineWidth: event.lineWidth ?? DEFAULT_LINE_WIDTH,
          lastPoint: point
        }

        remoteStrokesRef.current.set(strokeId, stroke)

        if (point) {
          drawPoint(point, stroke)
        }

        return
      }

      if (event.type === 'DRAW_POINTS') {
        const points = event.points ?? []

        if (points.length === 0) {
          return
        }

        const stroke =
          remoteStrokesRef.current.get(strokeId) ??
          ({
            tool: event.tool ?? 'PEN',
            color: event.color ?? DEFAULT_COLOR,
            lineWidth: event.lineWidth ?? DEFAULT_LINE_WIDTH
          } satisfies StrokeState)

        let lastPoint = stroke.lastPoint

        points.forEach((point) => {
          if (lastPoint) {
            drawSegment(lastPoint, point, stroke)
          } else {
            drawPoint(point, stroke)
          }

          lastPoint = point
        })

        remoteStrokesRef.current.set(strokeId, {
          ...stroke,
          lastPoint
        })
        return
      }

      if (event.type === 'DRAW_END') {
        remoteStrokesRef.current.delete(strokeId)
      }
    },
    [clearCanvas, drawPoint, drawSegment, rememberEvent]
  )

  const replayEvents = useCallback(
    (events: WhiteboardEvent[]): void => {
      clearCanvas()
      remoteStrokesRef.current.clear()

      events.forEach((event) => {
        seenEventsRef.current.add(eventKey(event))
        applyWhiteboardEvent(event, false)
      })
    },
    [applyWhiteboardEvent, clearCanvas]
  )

  const loadWhiteboardEvents = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      return
    }

    loadingInitialRef.current = true
    pendingRealtimeEventsRef.current = []
    setLoading(true)
    setError(null)

    try {
      const events = await fetchWhiteboardEvents(sessionId)
      historyRef.current = [...events]
      seenEventsRef.current = new Set(events.map(eventKey))
      replayEvents(events)

      const pendingEvents = pendingRealtimeEventsRef.current
      pendingRealtimeEventsRef.current = []
      pendingEvents.forEach((event) => applyWhiteboardEvent(event, true))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Could not load whiteboard: ${message}`)
    } finally {
      loadingInitialRef.current = false
      setLoading(false)
    }
  }, [applyWhiteboardEvent, replayEvents, sessionId])

  const publishEvent = useCallback(
    async (event: WhiteboardEvent, retry = true): Promise<void> => {
      if (!sessionId || !stompClient?.connected) {
        setError('Connecting whiteboard...')
        return
      }

      try {
        const token = await ensureAccessToken()
        stompClient.publish({
          destination: `/app/sessions/${sessionId}/whiteboard.draw`,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(event)
        })
      } catch (err) {
        if (retry && getRefreshToken()) {
          try {
            await refreshTokens()
            await publishEvent(event, false)
            return
          } catch {
            // Fall through to the user-visible publish error below.
          }
        }

        const message = err instanceof Error ? err.message : String(err)
        setError(`Could not send whiteboard event: ${message}`)
      }
    },
    [sessionId, stompClient]
  )

  const flushPoints = useCallback((): void => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }

    const strokeId = currentStrokeIdRef.current
    const points = pointsBufferRef.current

    if (!strokeId || points.length === 0) {
      return
    }

    const event: WhiteboardEvent = {
      type: 'DRAW_POINTS',
      strokeId,
      points: [...points]
    }

    pointsBufferRef.current = []
    lastFlushAtRef.current = Date.now()
    rememberEvent(event, false)
    void publishEvent(event)
  }, [publishEvent, rememberEvent])

  const scheduleFlush = useCallback((): void => {
    const elapsed = Date.now() - lastFlushAtRef.current

    if (elapsed >= DRAW_POINTS_THROTTLE_MS) {
      flushPoints()
      return
    }

    if (flushTimerRef.current === null) {
      flushTimerRef.current = window.setTimeout(
        flushPoints,
        DRAW_POINTS_THROTTLE_MS - elapsed
      )
    }
  }, [flushPoints])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!canDraw || event.button !== 0) {
        return
      }

      const point = getCanvasPoint(event)

      if (!point) {
        return
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)

      const strokeId = crypto.randomUUID()
      const stroke: StrokeState = {
        tool,
        color,
        lineWidth
      }
      const drawStartEvent: WhiteboardEvent = {
        type: 'DRAW_START',
        strokeId,
        tool,
        color,
        lineWidth,
        points: [point]
      }

      isDrawingRef.current = true
      currentStrokeIdRef.current = strokeId
      lastLocalPointRef.current = point
      pointsBufferRef.current = []
      lastFlushAtRef.current = Date.now()

      drawPoint(point, stroke)
      rememberEvent(drawStartEvent, false)
      void publishEvent(drawStartEvent)
    },
    [canDraw, color, drawPoint, getCanvasPoint, lineWidth, publishEvent, rememberEvent, tool]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!isDrawingRef.current || !currentStrokeIdRef.current) {
        return
      }

      const point = getCanvasPoint(event)
      const previousPoint = lastLocalPointRef.current

      if (!point || !previousPoint || pointDistance(previousPoint, point) < MIN_POINT_DISTANCE) {
        return
      }

      event.preventDefault()

      const stroke: StrokeState = {
        tool,
        color,
        lineWidth
      }

      drawSegment(previousPoint, point, stroke)
      lastLocalPointRef.current = point
      pointsBufferRef.current.push(point)
      scheduleFlush()
    },
    [color, drawSegment, getCanvasPoint, lineWidth, scheduleFlush, tool]
  )

  const finishStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!isDrawingRef.current) {
        return
      }

      event.preventDefault()

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const strokeId = currentStrokeIdRef.current

      flushPoints()

      if (strokeId) {
        const drawEndEvent: WhiteboardEvent = {
          type: 'DRAW_END',
          strokeId
        }

        rememberEvent(drawEndEvent, false)
        void publishEvent(drawEndEvent)
      }

      isDrawingRef.current = false
      currentStrokeIdRef.current = null
      lastLocalPointRef.current = null
      pointsBufferRef.current = []
    },
    [flushPoints, publishEvent, rememberEvent]
  )

  const clearBoard = useCallback((): void => {
    const clearEvent: WhiteboardEvent = {
      type: 'CLEAR'
    }

    clearCanvas()
    remoteStrokesRef.current.clear()
    rememberEvent(clearEvent, false)
    void publishEvent(clearEvent)
  }, [clearCanvas, publishEvent, rememberEvent])

  useEffect(() => {
    if (!enabled) {
      setSubscribed(false)
      return
    }

    let subscription: StompSubscription | null = null

    if (stompClient?.connected && stompConnected) {
      subscription = stompClient.subscribe(
        `/topic/sessions/${sessionId}/whiteboard`,
        (message: IMessage) => {
          try {
            const receivedEvent = JSON.parse(message.body) as WhiteboardEvent

            if (receivedEvent.senderUsername && receivedEvent.senderUsername === currentUsername) {
              return
            }

            onRemoteEvent?.(receivedEvent)

            if (loadingInitialRef.current) {
              pendingRealtimeEventsRef.current.push(receivedEvent)
              return
            }

            applyWhiteboardEvent(receivedEvent, true)
          } catch (err) {
            console.error('Failed to parse whiteboard event:', err)
          }
        }
      )
      setSubscribed(true)
    } else {
      setSubscribed(false)
    }

    void loadWhiteboardEvents()

    return () => {
      subscription?.unsubscribe()
      setSubscribed(false)
    }
  }, [
    applyWhiteboardEvent,
    connectionKey,
    currentUsername,
    enabled,
    loadWhiteboardEvents,
    onRemoteEvent,
    sessionId,
    stompClient,
    stompConnected
  ])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const resizeCanvas = (): void => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      const needsResize = canvas.width !== width || canvas.height !== height

      if (needsResize) {
        canvas.width = width
        canvas.height = height
      }

      const context = canvas.getContext('2d')

      if (!context) {
        setError('Could not initialize whiteboard canvas.')
        return
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      contextRef.current = context

      if (needsResize) {
        replayEvents(historyRef.current)
      }
    }

    resizeCanvas()

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(canvas)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [enabled, replayEvents])

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current)
      }
    }
  }, [])

  return {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    lineWidth,
    setLineWidth,
    clearBoard,
    loadWhiteboardEvents,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: finishStroke,
    handlePointerLeave: finishStroke,
    loading,
    error,
    subscribed,
    canDraw
  }
}
