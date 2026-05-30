import type { VideoTrack } from 'livekit-client'
import { useEffect, useRef } from 'react'

interface TrackVideoProps {
  className?: string
  fit?: 'cover' | 'contain'
  muted?: boolean
  track: VideoTrack
}

export function TrackVideo({
  className,
  fit = 'cover',
  muted = false,
  track
}: TrackVideoProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    videoElement.muted = muted
    track.attach(videoElement)

    return () => {
      track.detach(videoElement)
    }
  }, [muted, track])

  return (
    <video
      ref={videoRef}
      autoPlay
      className={className}
      muted={muted}
      playsInline
      style={{ objectFit: fit }}
    />
  )
}
