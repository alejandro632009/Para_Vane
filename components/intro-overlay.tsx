"use client"

type IntroOverlayProps = {
  onStart: () => void
}

export function IntroOverlay({ onStart }: IntroOverlayProps) {
  return (
    <section
      className="fixed inset-0 z-10 grid place-items-center p-6"
      aria-label="Bienvenida a para_Vane"
      style={{
        background:
          "radial-gradient(circle at 50% 14%, rgba(120, 90, 255, 0.28), transparent 18rem), radial-gradient(circle at 50% 88%, rgba(255, 61, 112, 0.2), transparent 19rem), linear-gradient(180deg, #0b0524, #05010f 62%, #14062b)",
      }}
    >
      <div className="relative flex w-[min(88vw,380px)] flex-col items-center gap-5 overflow-hidden rounded-2xl border border-[rgba(180,160,255,0.28)] px-7 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-sm"
        style={{
          background:
            "linear-gradient(180deg, rgba(60,40,130,0.55), rgba(20,8,46,0.82)), rgba(15,6,40,0.9)",
        }}
      >
        <div
          className="pointer-events-none absolute -inset-x-10 -top-24 h-40"
          style={{
            background:
              "radial-gradient(circle, rgba(180,160,255,0.3), transparent 68%)",
          }}
          aria-hidden="true"
        />

        <p className="relative text-[11px] font-medium uppercase tracking-[0.4em] text-[#c5b3ff]">
          Para Vane
        </p>

        <GiftSticker />

        <button
          type="button"
          onClick={onStart}
          className="relative mt-2 inline-flex h-11 items-center justify-center rounded-full px-9 text-xs font-bold uppercase tracking-[0.25em] text-white transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5b3ff]"
          style={{
            background: "linear-gradient(180deg, #ff4d7c, #e21a5a)",
            boxShadow:
              "0 0 28px rgba(255,61,112,0.7), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          INICIAR
        </button>
      </div>
    </section>
  )
}

function GiftSticker() {
  return (
    <img
      className="relative h-28 w-28 object-contain drop-shadow-[0_8px_16px_rgba(120,90,255,0.4)]"
      src="/gift.gif"
      alt="Sticker animado de regalo"
      loading="eager"
      decoding="async"
    />
  )
}
