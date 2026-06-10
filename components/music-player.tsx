"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  FastForward,
  Music2,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
} from "lucide-react"

type Song = {
  title: string
  artist: string
  src: string
}

const PLAYLIST: Song[] = [
  {
    title: "1960",
    artist: "HUMBE",
    src: "/music/humbe-1960.mp3",
  },
  {
    title: "Nothing's Gonna Hurt You Baby",
    artist: "Cigarettes After Sex",
    src: "/music/cigarettes-after-sex-nothings-gonna-hurt-you-baby.mp3",
  },
  {
    title: "Cuando me acerco a ti",
    artist: "Danny Ocean",
    src: "/music/danny-ocean-cuando-me-acerco-a-ti.mp3",
  },
  {
    title: "Morfina",
    artist: "HUMBE",
    src: "/music/humbe-morfina.mp3",
  },
  {
    title: "Bailame",
    artist: "Danny Ocean",
    src: "/music/danny-ocean-bailame.mp3",
  },
]

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00"

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function MusicPlayer({ started }: { started: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.58)

  const currentSong = PLAYLIST[currentIndex]

  function playAudio() {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = volume
    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }

  function pauseAudio() {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setIsPlaying(false)
  }

  function goToTrack(nextIndex: number) {
    setCurrentIndex((nextIndex + PLAYLIST.length) % PLAYLIST.length)
    setCurrentTime(0)
  }

  function shiftTrack(direction: -1 | 1) {
    goToTrack(currentIndex + direction)
  }

  function skipSeconds(seconds: number) {
    const audio = audioRef.current
    if (!audio) return

    const max = audio.duration || duration || 0
    audio.currentTime = clamp(audio.currentTime + seconds, 0, max)
    setCurrentTime(audio.currentTime)
  }

  function togglePlayback() {
    if (isPlaying) {
      pauseAudio()
      return
    }

    playAudio()
  }

  function changeVolume(nextVolume: number) {
    const safeVolume = clamp(nextVolume, 0, 1)
    const audio = audioRef.current
    if (audio) {
      audio.volume = safeVolume
    }
    setVolume(safeVolume)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.load()
    setCurrentTime(0)

    if (started && isPlaying) {
      playAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  useEffect(() => {
    function startMusic() {
      playAudio()
    }

    window.addEventListener("galaxy-start-music", startMusic)
    return () => window.removeEventListener("galaxy-start-music", startMusic)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <audio
        ref={audioRef}
        data-galaxy-music="true"
        src={currentSong.src}
        preload="auto"
        onEnded={() => {
          setIsPlaying(true)
          goToTrack(currentIndex + 1)
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onVolumeChange={(event) => setVolume(event.currentTarget.volume)}
      />

      {started && (
        <section
          className="fixed inset-x-3 bottom-4 z-[7] mx-auto w-[min(31rem,calc(100vw-1.5rem))] rounded-lg border border-[rgba(197,179,255,0.32)] bg-[rgba(10,5,28,0.72)] px-3 py-3 text-[#fdf2ff] shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-md"
          aria-label="Reproductor de musica"
        >
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[rgba(255,111,156,0.32)] bg-[rgba(255,61,112,0.16)] text-[#ffd6e8] shadow-[0_0_22px_rgba(255,61,112,0.28)]"
              aria-hidden="true"
            >
              <Music2 size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-5">{currentSong.title}</p>
              <p className="truncate text-xs leading-4 text-[#c5b3ff]/82">{currentSong.artist}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton label="Cancion anterior" onClick={() => shiftTrack(-1)}>
                <SkipBack size={17} />
              </IconButton>
              <IconButton label="Atrasar 5 segundos" onClick={() => skipSeconds(-5)}>
                <Rewind size={17} />
              </IconButton>
              <IconButton featured label={isPlaying ? "Pausar" : "Reproducir"} onClick={togglePlayback}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </IconButton>
              <IconButton label="Adelantar 5 segundos" onClick={() => skipSeconds(5)}>
                <FastForward size={17} />
              </IconButton>
              <IconButton label="Siguiente cancion" onClick={() => shiftTrack(1)}>
                <SkipForward size={17} />
              </IconButton>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[2.7rem_1fr_2.7rem] items-center gap-2 text-[11px] tabular-nums text-[#d8ccff]/85">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={duration ? currentTime : 0}
              onChange={(event) => {
                const audio = audioRef.current
                const nextTime = Number(event.currentTarget.value)
                if (audio) {
                  audio.currentTime = nextTime
                }
                setCurrentTime(nextTime)
              }}
              className="h-1.5 w-full cursor-pointer accent-[#ff4d7c]"
              aria-label="Progreso de la cancion"
            />
            <span className="text-right">{formatTime(duration)}</span>
          </div>

          <div className="mt-3 grid grid-cols-[2.2rem_1fr_2.2rem_2.3rem] items-center gap-2 text-[11px] tabular-nums text-[#d8ccff]/85">
            <button
              type="button"
              aria-label="Bajar volumen"
              title="Bajar volumen"
              onClick={() => changeVolume(volume - 0.1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-[rgba(197,179,255,0.18)] bg-[rgba(255,255,255,0.06)] text-[#ffd6e8] transition-colors hover:bg-[rgba(255,255,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5b3ff]"
            >
              <Volume1 size={15} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => changeVolume(Number(event.currentTarget.value))}
              onInput={(event) => changeVolume(Number(event.currentTarget.value))}
              className="h-1.5 w-full cursor-pointer accent-[#ff4d7c]"
              aria-label="Volumen"
            />
            <button
              type="button"
              aria-label="Subir volumen"
              title="Subir volumen"
              onClick={() => changeVolume(volume + 0.1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-[rgba(197,179,255,0.18)] bg-[rgba(255,255,255,0.06)] text-[#ffd6e8] transition-colors hover:bg-[rgba(255,255,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5b3ff]"
            >
              <Volume2 size={15} />
            </button>
            <span className="text-right">{Math.round(volume * 100)}%</span>
          </div>
        </section>
      )}
    </>
  )
}

function IconButton({
  children,
  featured = false,
  label,
  onClick,
}: {
  children: ReactNode
  featured?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        featured
          ? "grid h-10 w-10 place-items-center rounded-full bg-[#ff4d7c] text-white shadow-[0_0_24px_rgba(255,61,112,0.58)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd6e8]"
          : "grid h-9 w-9 place-items-center rounded-full border border-[rgba(197,179,255,0.18)] bg-[rgba(255,255,255,0.06)] text-[#fdf2ff] transition-colors hover:bg-[rgba(255,255,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5b3ff]"
      }
    >
      {children}
    </button>
  )
}
