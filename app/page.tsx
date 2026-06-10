"use client"

import { useState } from "react"
import { GalaxyCanvas } from "@/components/galaxy-canvas"
import { Heart3D } from "@/components/heart-3d"
import { IntroOverlay } from "@/components/intro-overlay"
import { FloatingCouples } from "@/components/floating-couples"
import { MusicPlayer } from "@/components/music-player"

export default function Page() {
  const [started, setStarted] = useState(false)

  function handleStart() {
    setStarted(true)
    const audio = document.querySelector<HTMLAudioElement>('[data-galaxy-music="true"]')
    if (audio) {
      audio.volume = 0.58
      void audio.play().catch(() => {
        window.dispatchEvent(new Event("galaxy-start-music"))
      })
    }
    window.dispatchEvent(new Event("galaxy-start-music"))
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <GalaxyCanvas started={started} />
      <Heart3D started={started} />

      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-60 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at center, transparent 36%, rgba(0,0,0,0.78) 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-15"
        style={{
          background:
            "linear-gradient(180deg, rgba(200,180,255,0.08), transparent 5rem), linear-gradient(0deg, rgba(255,120,170,0.06), transparent 4rem)",
        }}
        aria-hidden="true"
      />

      <FloatingCouples visible={started} />
      <MusicPlayer started={started} />

      {!started && <IntroOverlay onStart={handleStart} />}
    </main>
  )
}
