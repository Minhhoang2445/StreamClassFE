import { Participant, Room, RoomEvent, Track, type AudioTrack, type VideoTrack } from 'livekit-client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getLiveSessionById, joinSession, startSession } from '../api/liveSessionApi'
import { ChatPanel } from '../components/chat/ChatPanel'
import { ControlBar } from '../components/classroom/ControlBar'
import { MainStage } from '../components/classroom/MainStage'
import { ParticipantSidebar } from '../components/classroom/ParticipantSidebar'
import { TopBar } from '../components/classroom/TopBar'
import { ErrorBanner } from '../components/live/ErrorBanner'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../hooks/useAuth'
import { Role } from '../types/auth'
import type { LiveSessionResponse, LiveSessionTokenResponse } from '../types/liveSession'
import { LiveSessionStatus } from '../types/liveSession'
import { getApiErrorMessage } from '../utils/apiError'


interface LiveRoomLocationState {
  tokenResponse?: LiveSessionTokenResponse
  returnTo?: string
}

type ConnectionUiState = 'idle' | 'loading-token' | 'connecting' | 'connected' | 'disconnected'

interface MainStageSelection {
  isScreenShare: boolean
  participant: Participant | null
  presenterCameraTrack?: VideoTrack | null
  videoTrack: VideoTrack | null
}

interface VideoTrackItem {
  order: number
  participant: Participant
  track: VideoTrack
}

interface AudioTrackItem {
  participant: Participant
  track: AudioTrack
}

interface ClassroomTrackGroups {
  audioTracks: AudioTrackItem[]
  cameraTracks: VideoTrackItem[]
  screenShareTracks: VideoTrackItem[]
}

function statusLabel(state: ConnectionUiState): string {
  switch (state) {
    case 'loading-token':
      return 'Dang xin LiveKit token tu backend...'
    case 'connecting':
      return 'Dang ket noi LiveKit...'
    case 'connected':
      return 'Da ket noi LiveKit.'
    case 'disconnected':
      return 'Da ngat ket noi LiveKit.'
    case 'idle':
    default:
      return ''
  }
}

function canStart(role: Role | null, session: LiveSessionResponse | null): boolean {
  return Boolean(
    session &&
    session.status !== LiveSessionStatus.Live &&
    (role === Role.Admin || role === Role.Teacher)
  )
}

function canJoin(role: Role | null, session: LiveSessionResponse | null): boolean {
  return Boolean(session && session.status === LiveSessionStatus.Live && role !== null)
}

function participantDisplayName(
  participant: Participant | null,
  roomToken?: LiveSessionTokenResponse | null
): string {
  if (!participant) {
    return 'Waiting for video'
  }

  if (participant.isLocal && roomToken?.username) {
    return roomToken.username
  }

  return participant.name || participant.identity || 'Participant'
}

function participantId(participant: Participant | null | undefined): string | undefined {
  return participant ? participant.sid || participant.identity : undefined
}

function participantKey(participant: Participant): string {
  return participant.sid || participant.identity || participant.name || 'participant'
}

function getVideoTrack(participant: Participant, source: Track.Source): VideoTrack | null {
  const publication = participant.getTrackPublication(source)

  if (!publication || publication.isMuted) {
    return null
  }

  return publication.videoTrack ?? null
}

function getAudioTrack(participant: Participant, source: Track.Source): AudioTrack | null {
  const publication = participant.getTrackPublication(source)

  if (!publication || publication.isMuted) {
    return null
  }

  return publication.audioTrack ?? null
}

function isHostParticipant(
  participant: Participant,
  session: LiveSessionResponse | null,
  roomToken: LiveSessionTokenResponse | null,
  role: Role | null
): boolean {
  if (session?.hostId && participant.identity === session.hostId) {
    return true
  }

  if (
    session?.hostUsername &&
    (participant.identity === session.hostUsername || participant.name === session.hostUsername)
  ) {
    return true
  }

  return Boolean(
    participant.isLocal &&
    roomToken?.identity === participant.identity &&
    (role === Role.Admin || role === Role.Teacher)
  )
}

function collectParticipantTracks(
  participants: Participant[],
  screenShareOrder: Map<string, number>
): ClassroomTrackGroups {
  const screenShareTracks: VideoTrackItem[] = []
  const cameraTracks: VideoTrackItem[] = []
  const audioTracks: AudioTrackItem[] = []

  participants.forEach((participant) => {
    const screenShareTrack = getVideoTrack(participant, Track.Source.ScreenShare)
    const cameraTrack = getVideoTrack(participant, Track.Source.Camera)
    const audioTrack = getAudioTrack(participant, Track.Source.Microphone)

    if (screenShareTrack) {
      screenShareTracks.push({
        order: screenShareOrder.get(participantKey(participant)) ?? 0,
        participant,
        track: screenShareTrack
      })
    }

    if (cameraTrack) {
      cameraTracks.push({
        order: 0,
        participant,
        track: cameraTrack
      })
    }

    if (audioTrack) {
      audioTracks.push({
        participant,
        track: audioTrack
      })
    }
  })

  return {
    audioTracks,
    cameraTracks,
    screenShareTracks
  }
}

function selectMainStage(
  trackGroups: ClassroomTrackGroups,
  session: LiveSessionResponse | null,
  roomToken: LiveSessionTokenResponse | null,
  role: Role | null
): MainStageSelection {
  const screenShareTracks = [...trackGroups.screenShareTracks].sort((a, b) => b.order - a.order)
  const hostScreenShare = screenShareTracks.find(({ participant }) =>
    isHostParticipant(participant, session, roomToken, role)
  )

  const selectedScreenShare = hostScreenShare ?? screenShareTracks[0]

  if (selectedScreenShare) {
    return {
      isScreenShare: true,
      participant: selectedScreenShare.participant,
      presenterCameraTrack: getVideoTrack(selectedScreenShare.participant, Track.Source.Camera),
      videoTrack: selectedScreenShare.track
    }
  }

  const hostCamera = trackGroups.cameraTracks.find(({ participant }) =>
    isHostParticipant(participant, session, roomToken, role)
  )

  if (hostCamera) {
    return {
      isScreenShare: false,
      participant: hostCamera.participant,
      videoTrack: hostCamera.track
    }
  }

  const activeSpeakerCamera = trackGroups.cameraTracks.find(({ participant }) => participant.isSpeaking)

  if (activeSpeakerCamera) {
    return {
      isScreenShare: false,
      participant: activeSpeakerCamera.participant,
      videoTrack: activeSpeakerCamera.track
    }
  }

  const localTeacher = trackGroups.cameraTracks.find(
    ({ participant }) => participant.isLocal && (role === Role.Admin || role === Role.Teacher)
  )

  if (localTeacher) {
    return {
      isScreenShare: false,
      participant: localTeacher.participant,
      videoTrack: localTeacher.track
    }
  }

  const firstCameraParticipant = trackGroups.cameraTracks[0]

  if (firstCameraParticipant) {
    return {
      isScreenShare: false,
      participant: firstCameraParticipant.participant,
      videoTrack: firstCameraParticipant.track
    }
  }

  return {
    isScreenShare: false,
    participant: null,
    videoTrack: null
  }
}

function formatDuration(startTime: string | null, now: number): string | undefined {
  if (!startTime) {
    return undefined
  }

  const startedAt = new Date(startTime).getTime()

  if (Number.isNaN(startedAt)) {
    return undefined
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  const seconds = elapsedSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function LiveRoomPage(): JSX.Element {
  const { sessionId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { role } = useAuth()
  const locationState = location.state as LiveRoomLocationState | null
  const initialToken = locationState?.tokenResponse ?? null
  const returnTo = locationState?.returnTo

  const [session, setSession] = useState<LiveSessionResponse | null>(null)
  const [roomToken, setRoomToken] = useState<LiveSessionTokenResponse | null>(initialToken)
  const [room, setRoom] = useState<Room | null>(null)
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionUiState>(
    initialToken ? 'connecting' : 'idle'
  )
  const [error, setError] = useState('')
  const [micEnabled, setMicEnabled] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [screenShareEnabled, setScreenShareEnabled] = useState(false)
  const [participantsOpen, setParticipantsOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [renderVersion, setRenderVersion] = useState(0)
  const roomRef = useRef<Room | null>(null)
  const screenShareOrderRef = useRef<Map<string, number>>(new Map())
  const screenShareCounterRef = useRef(0)

  const syncScreenShareOrder = useCallback((participantsInRoom: Participant[]): void => {
    const activeKeys = new Set<string>()

    participantsInRoom.forEach((participant) => {
      if (!getVideoTrack(participant, Track.Source.ScreenShare)) {
        return
      }

      const key = participantKey(participant)
      activeKeys.add(key)

      if (!screenShareOrderRef.current.has(key)) {
        screenShareCounterRef.current += 1
        screenShareOrderRef.current.set(key, screenShareCounterRef.current)
      }
    })

    Array.from(screenShareOrderRef.current.keys()).forEach((key) => {
      if (!activeKeys.has(key)) {
        screenShareOrderRef.current.delete(key)
      }
    })
  }, [])

  const syncParticipants = useCallback((activeRoom: Room): void => {
    const nextRemoteParticipants = Array.from(activeRoom.remoteParticipants.values())
    syncScreenShareOrder([activeRoom.localParticipant, ...nextRemoteParticipants])
    setRemoteParticipants(nextRemoteParticipants)
    setMicEnabled(activeRoom.localParticipant.isMicrophoneEnabled)
    setCameraEnabled(activeRoom.localParticipant.isCameraEnabled)
    setScreenShareEnabled(activeRoom.localParticipant.isScreenShareEnabled)
  }, [syncScreenShareOrder])

  const requestToken = useCallback(
    async (loadedSession: LiveSessionResponse): Promise<void> => {
      setConnectionState('loading-token')
      setError('')

      if (canStart(role, loadedSession)) {
        const tokenResponse = await startSession(loadedSession.id)
        setRoomToken(tokenResponse)
        return
      }

      if (canJoin(role, loadedSession)) {
        // TODO(backend): handoff notes current /join is restricted to STUDENT.
        // Keep using joinSession for LIVE sessions so TEACHER/ADMIN reconnect works once backend permits it.
        const tokenResponse = await joinSession(loadedSession.id)
        setRoomToken(tokenResponse)
        return
      }

      throw new Error('Session chua LIVE hoac role hien tai khong duoc start/join theo contract.')
    },
    [role]
  )

  useEffect(() => {
    let active = true

    const loadSessionAndToken = async (): Promise<void> => {
      if (!sessionId) {
        setError('Thieu sessionId tren URL.')
        return
      }

      try {
        const loadedSession = await getLiveSessionById(sessionId)
        if (!active) {
          return
        }
        setSession(loadedSession)

        if (!initialToken) {
          await requestToken(loadedSession)
        }
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err))
          setConnectionState('idle')
        }
      }
    }

    void loadSessionAndToken()

    return () => {
      active = false
    }
  }, [initialToken, requestToken, sessionId])

  useEffect(() => {
    if (!roomToken || roomRef.current) {
      return
    }

    let active = true
    const activeRoom = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = activeRoom

    const updateParticipants = (): void => {
      syncParticipants(activeRoom)
      setRenderVersion((value) => value + 1)
    }

    const markConnected = (): void => {
      setConnectionState('connected')
      updateParticipants()
    }

    const markDisconnected = (): void => {
      setConnectionState('disconnected')
      setRoom(null)
      setRemoteParticipants([])
      setMicEnabled(false)
      setCameraEnabled(false)
      setScreenShareEnabled(false)
      setRenderVersion((value) => value + 1)
      if (roomRef.current === activeRoom) {
        roomRef.current = null
      }
    }

    const connect = async (): Promise<void> => {
      if (!roomToken.livekitUrl || !roomToken.token) {
        setError('Backend token response thieu livekitUrl hoac token.')
        setConnectionState('idle')
        roomRef.current = null
        return
      }

      activeRoom
        .on(RoomEvent.Connected, markConnected)
        .on(RoomEvent.Disconnected, markDisconnected)
        .on(RoomEvent.ParticipantConnected, updateParticipants)
        .on(RoomEvent.ParticipantDisconnected, updateParticipants)
        .on(RoomEvent.TrackPublished, updateParticipants)
        .on(RoomEvent.TrackSubscribed, updateParticipants)
        .on(RoomEvent.TrackUnpublished, updateParticipants)
        .on(RoomEvent.TrackUnsubscribed, updateParticipants)
        .on(RoomEvent.TrackMuted, updateParticipants)
        .on(RoomEvent.TrackUnmuted, updateParticipants)
        .on(RoomEvent.LocalTrackPublished, updateParticipants)
        .on(RoomEvent.LocalTrackUnpublished, updateParticipants)
        .on(RoomEvent.ActiveSpeakersChanged, updateParticipants)
        .on(RoomEvent.ParticipantNameChanged, updateParticipants)

      try {
        setConnectionState('connecting')
        setError('')
        await activeRoom.connect(roomToken.livekitUrl, roomToken.token)

        if (!active) {
          activeRoom.disconnect()
          return
        }

        setRoom(activeRoom)
        updateParticipants()

        try {
          await activeRoom.localParticipant.setMicrophoneEnabled(true)
        } catch {
          setMicEnabled(false)
        }

        try {
          await activeRoom.localParticipant.setCameraEnabled(true)
        } catch {
          setCameraEnabled(false)
        }

        updateParticipants()
      } catch (err) {
        setError(getApiErrorMessage(err))
        setConnectionState('idle')
        activeRoom.disconnect()
        if (roomRef.current === activeRoom) {
          roomRef.current = null
        }
      }
    }

    const connectTimer = window.setTimeout(() => {
      if (active) {
        void connect()
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(connectTimer)
      activeRoom
        .off(RoomEvent.Connected, markConnected)
        .off(RoomEvent.Disconnected, markDisconnected)
        .off(RoomEvent.ParticipantConnected, updateParticipants)
        .off(RoomEvent.ParticipantDisconnected, updateParticipants)
        .off(RoomEvent.TrackPublished, updateParticipants)
        .off(RoomEvent.TrackSubscribed, updateParticipants)
        .off(RoomEvent.TrackUnpublished, updateParticipants)
        .off(RoomEvent.TrackUnsubscribed, updateParticipants)
        .off(RoomEvent.TrackMuted, updateParticipants)
        .off(RoomEvent.TrackUnmuted, updateParticipants)
        .off(RoomEvent.LocalTrackPublished, updateParticipants)
        .off(RoomEvent.LocalTrackUnpublished, updateParticipants)
        .off(RoomEvent.ActiveSpeakersChanged, updateParticipants)
        .off(RoomEvent.ParticipantNameChanged, updateParticipants)
      activeRoom.disconnect()
      if (roomRef.current === activeRoom) {
        roomRef.current = null
      }
    }
  }, [roomToken, syncParticipants])

  useEffect(() => {
    if (!session?.actualStartTime) {
      return
    }

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [session?.actualStartTime])

  const leaveRoom = useCallback((): void => {
    const activeRoom = roomRef.current
    roomRef.current = null
    activeRoom?.disconnect()
    setRoom(null)
    setRoomToken(null)
    setRemoteParticipants([])
    setScreenShareEnabled(false)
    setConnectionState('disconnected')
    navigate(
      returnTo || (roomToken?.classroomId ? `/classrooms/${roomToken.classroomId}` : '/classrooms')
    )
  }, [navigate, returnTo, roomToken?.classroomId])

  const toggleMic = async (): Promise<void> => {
    if (!room) {
      return
    }

    const nextState = !room.localParticipant.isMicrophoneEnabled
    try {
      await room.localParticipant.setMicrophoneEnabled(nextState)
      syncParticipants(room)
      setRenderVersion((value) => value + 1)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const toggleCamera = async (): Promise<void> => {
    if (!room) {
      return
    }

    const nextState = !room.localParticipant.isCameraEnabled
    try {
      await room.localParticipant.setCameraEnabled(nextState)
      syncParticipants(room)
      setRenderVersion((value) => value + 1)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const toggleScreenShare = async (): Promise<void> => {
  if (!room) {
    setError('Chua ket noi LiveKit room.')
    return
  }

  if (role !== Role.Admin && role !== Role.Teacher) {
    setError('Chi giao vien hoac admin moi duoc share man hinh.')
    return
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    setError(
      'Moi truong hien tai khong ho tro getDisplayMedia. Neu dang chay Electron, hay cau hinh setDisplayMediaRequestHandler o main process.'
    )
    return
  }

  const nextState = !room.localParticipant.isScreenShareEnabled

  try {
    console.log('[screen-share] before toggle', {
      nextState,
      roomState: room.state,
      isScreenShareEnabled: room.localParticipant.isScreenShareEnabled,
      identity: room.localParticipant.identity
    })

    await room.localParticipant.setScreenShareEnabled(nextState)

    console.log('[screen-share] after toggle', {
      isScreenShareEnabled: room.localParticipant.isScreenShareEnabled
    })

    syncParticipants(room)
    setRenderVersion((value) => value + 1)
  } catch (err) {
    console.error('[screen-share] failed:', err)

    setScreenShareEnabled(room.localParticipant.isScreenShareEnabled)
    setError(getApiErrorMessage(err))
  }
}

  const participantCount = useMemo(
    () => (room ? remoteParticipants.length + 1 : 0),
    [remoteParticipants.length, room]
  )
  const participants = useMemo(
    () => (room ? [room.localParticipant, ...remoteParticipants] : []),
    [remoteParticipants, renderVersion, room]
  )
  const trackGroups = useMemo(
    () => collectParticipantTracks(participants, screenShareOrderRef.current),
    [participants, renderVersion]
  )
  const mainStage = useMemo(
    () => selectMainStage(trackGroups, session, roomToken, role),
    [renderVersion, role, roomToken, session, trackGroups]
  )
  const getIsTeacher = useCallback(
    (participant: Participant): boolean => isHostParticipant(participant, session, roomToken, role),
    [role, roomToken, session]
  )
  const title = session?.title || roomToken?.roomName || 'Live room'
  const showScreenShare = role === Role.Admin || role === Role.Teacher
  const screenShareSupported = Boolean(navigator.mediaDevices?.getDisplayMedia)
  const durationLabel = formatDuration(session?.actualStartTime ?? null, now)
  const mainParticipantId = participantId(mainStage.participant)

  return (
    <div className="page live-page">
      <div className="live-room-shell">
        <TopBar
          connectionLabel={statusLabel(connectionState)}
          durationLabel={durationLabel}
          participantCount={participantCount}
          roomName={roomToken?.roomName}
          session={session}
          title={title}
        />

        <ErrorBanner message={error} />

        {session && !roomToken && canStart(role, session) ? (
          <StatusMessage
            title="Co the start session"
            message="Neu trang nay khong tu start duoc, hay quay lai classroom detail va bam Start."
          />
        ) : null}

        {session?.status === LiveSessionStatus.Live && role !== Role.Student && !roomToken ? (
          <StatusMessage
            title="Backend reconnect cho teacher/admin can duoc bo sung"
            message="Handoff hien ghi /join chi cho STUDENT; UI da dung joinSession cho session LIVE va se hoat dong khi backend mo quyen."
          />
        ) : null}

        <section
          className={`live-main-area${participantsOpen ? '' : ' participants-hidden'}${
            chatOpen ? ' chat-open' : ''
          }`}
        >
          <MainStage
            displayName={
              room ? participantDisplayName(mainStage.participant, roomToken) : 'Chua ket noi LiveKit'
            }
            isLocal={mainStage.participant?.isLocal ?? false}
            isScreenShare={mainStage.isScreenShare}
            isTeacher={mainStage.participant ? getIsTeacher(mainStage.participant) : false}
            mainParticipant={room ? mainStage.participant : null}
            mainVideoTrack={room ? mainStage.videoTrack : null}
            presenterCameraTrack={mainStage.presenterCameraTrack}
          />

          {participantsOpen ? (
            <ParticipantSidebar
              getIsTeacher={getIsTeacher}
              mainParticipantId={mainParticipantId}
              participants={participants}
            />
          ) : null}

          {chatOpen ? (
            <ChatPanel
              sessionId={sessionId}
              enabled={!!room}
            />
          ) : null}
        </section>

        <ControlBar
          cameraEnabled={cameraEnabled}
          chatOpen={chatOpen}
          disabled={!room}
          micEnabled={micEnabled}
          onLeave={leaveRoom}
          onToggleCamera={() => void toggleCamera()}
          onToggleChat={() => setChatOpen((value) => !value)}
          onToggleMic={() => void toggleMic()}
          onToggleParticipants={() => setParticipantsOpen((value) => !value)}
          onToggleScreenShare={() => void toggleScreenShare()}
          participantCount={participantCount}
          participantsOpen={participantsOpen}
          screenShareEnabled={screenShareEnabled}
          screenShareSupported={screenShareSupported}
          showScreenShare={showScreenShare}
        />
      </div>
    </div>
  )
}
