import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import '../background-music.css'

const TRACK_PATH = '/audio/shui-jia-shao-nian-bu-nian-shao-v2.mp3'
const MUTED_STORAGE_KEY = 'yunyue-shop-background-music-muted'

export type BackgroundMusicHandle = {
  startFromEntrance: () => Promise<void>
  stop: (reset?: boolean) => void
}

type BackgroundMusicProps = {
  visible: boolean
  suspended: boolean
}

function readMutedPreference() {
  try {
    return window.localStorage.getItem(MUTED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeMutedPreference(muted: boolean) {
  try {
    window.localStorage.setItem(MUTED_STORAGE_KEY, String(muted))
  } catch {
    // Music controls remain usable when browser storage is unavailable.
  }
}

export const BackgroundMusic = forwardRef<BackgroundMusicHandle, BackgroundMusicProps>(function BackgroundMusic(
  { visible, suspended },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  function stop(reset = false) {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    if (reset) audio.currentTime = 0
    setPlaying(false)
  }

  async function startFromEntrance() {
    const audio = audioRef.current
    if (!audio || readMutedPreference()) return
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  useImperativeHandle(ref, () => ({ startFromEntrance, stop }))

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = 0.12
  }, [])

  useEffect(() => {
    if (suspended) stop()
  }, [suspended])

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      writeMutedPreference(true)
      setPlaying(false)
      return
    }
    writeMutedPreference(false)
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  return <>
    <audio
      ref={audioRef}
      src={TRACK_PATH}
      preload="metadata"
      loop
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
    />
    {visible && <div className="background-music" data-playing={playing}>
      <button
        className="background-music__button"
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? '暂停背景音乐《谁家少年不年少》' : '播放背景音乐《谁家少年不年少》'}
        aria-pressed={playing}
      >
        <span className="background-music__icon" aria-hidden="true">♪</span>
        <span className="background-music__copy">
          <span className="background-music__title">谁家少年不年少</span>
          <span className="background-music__state">{playing ? '曲声正好' : '曲声已歇'}</span>
        </span>
      </button>
    </div>}
  </>
})
