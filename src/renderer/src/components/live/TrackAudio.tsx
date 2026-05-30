import type { AudioTrack } from 'livekit-client'
import { useEffect, useRef } from 'react'

interface TrackAudioProps {
  track: AudioTrack
}

export function TrackAudio({ track }: TrackAudioProps): JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audioElement = audioRef.current

    if (!audioElement) {
      return
    }

    track.attach(audioElement)

    return () => {
      track.detach(audioElement)
    }
  }, [track])

  return <audio ref={audioRef} autoPlay />
}
