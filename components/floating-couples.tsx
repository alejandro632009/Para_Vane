"use client"

import { useEffect, useRef } from "react"

type OrbitItem = {
  id: number
  src: string
  alt: string
  angle: number
  speed: number
  size: number
  radius: number
  yOffset: number
  tilt: number
  phase: number
}

type CameraDetail = {
  rotation?: number
  tilt?: number
  zoom?: number
  y?: number
  centerX?: number
  centerY?: number
  scale?: number
}

type CameraState = Required<CameraDetail>

type WindowWithOrbitDebug = Window & {
  __orbitingCouplesReady?: boolean
  __orbitingCouplesCount?: number
  __orbitingCoupleSnapshot?: () => Array<{ x: number; y: number }>
}

const CAMERA_DEFAULT: CameraState = {
  rotation: -0.12,
  tilt: 0,
  zoom: 1.08,
  y: 0,
  centerX: 0,
  centerY: 0,
  scale: 1,
}

const ITEMS: OrbitItem[] = [
  {
    id: 1,
    src: "/couples/clean-spider.png",
    alt: "Pareja estilo heroe rojo",
    angle: -0.15,
    speed: 0.48,
    size: 108,
    radius: 1.02,
    yOffset: 8,
    tilt: -10,
    phase: 0.2,
  },
  {
    id: 2,
    src: "/couples/color-bunnies.png",
    alt: "Pareja de conejitos",
    angle: 0.92,
    speed: 0.42,
    size: 88,
    radius: 0.92,
    yOffset: -2,
    tilt: 8,
    phase: 1.1,
  },
  {
    id: 3,
    src: "/couples/color-cats.png",
    alt: "Pareja de gatitos",
    angle: 2.05,
    speed: 0.44,
    size: 78,
    radius: 1.04,
    yOffset: 4,
    tilt: -8,
    phase: 2.2,
  },
  {
    id: 4,
    src: "/couples/clean-bears.png",
    alt: "Pareja de ositos",
    angle: 3.08,
    speed: 0.38,
    size: 68,
    radius: 0.84,
    yOffset: -6,
    tilt: 9,
    phase: 3.4,
  },
  {
    id: 5,
    src: "/couples/color-puppies.png",
    alt: "Pareja de perritos",
    angle: 4.18,
    speed: 0.46,
    size: 72,
    radius: 0.98,
    yOffset: 5,
    tilt: -7,
    phase: 4.4,
  },
  {
    id: 6,
    src: "/couples/color-bunnies.png",
    alt: "Pareja pequena de conejitos",
    angle: 5.18,
    speed: 0.4,
    size: 58,
    radius: 0.74,
    yOffset: -12,
    tilt: 7,
    phase: 5.2,
  },
]

function getHeartCenter(width: number, height: number, camera: CameraState) {
  return {
    x: camera.centerX || width * 0.5,
    y: camera.centerY || (width < 620 ? height * 0.4 : height * 0.39),
  }
}

function orbitLocalY(width: number) {
  return width < 620 ? 72 : 84
}

function projectAroundHeart(
  localX: number,
  localY: number,
  localZ: number,
  camera: CameraState,
  center: { x: number; y: number },
) {
  const yawCos = Math.cos(camera.rotation)
  const yawSin = Math.sin(camera.rotation)
  const pitchCos = Math.cos(camera.tilt)
  const pitchSin = Math.sin(camera.tilt)
  const xYaw = localX * yawCos - localZ * yawSin
  const zYaw = localX * yawSin + localZ * yawCos
  const yPitch = localY * pitchCos - zYaw * pitchSin
  const zPitch = localY * pitchSin + zYaw * pitchCos
  const perspective = Math.max(0.5, Math.min(1.55, 1 / (1 + zPitch / 980)))

  return {
    x: center.x + xYaw * camera.scale * perspective,
    y: center.y + yPitch * camera.scale * perspective,
    z: zPitch,
    perspective,
  }
}

export function FloatingCouples({ visible }: { visible: boolean }) {
  const nodesRef = useRef<Array<HTMLDivElement | null>>([])
  const cameraRef = useRef<CameraState>({ ...CAMERA_DEFAULT })
  const snapshotRef = useRef<Array<{ x: number; y: number }>>([])

  useEffect(() => {
    if (!visible) return

    let rafId = 0

    const onCameraChange = (event: Event) => {
      const detail = (event as CustomEvent<CameraDetail>).detail ?? {}
      cameraRef.current = {
        rotation: detail.rotation ?? cameraRef.current.rotation,
        tilt: detail.tilt ?? cameraRef.current.tilt,
        zoom: detail.zoom ?? cameraRef.current.zoom,
        y: detail.y ?? cameraRef.current.y,
        centerX: detail.centerX ?? cameraRef.current.centerX,
        centerY: detail.centerY ?? cameraRef.current.centerY,
        scale: detail.scale ?? cameraRef.current.scale,
      }
    }

    const animate = (now: number) => {
      const time = now / 1000
      const width = window.innerWidth
      const height = window.innerHeight
      const camera = cameraRef.current
      const center = getHeartCenter(width, height, camera)
      const isPhone = width < 430
      const isMobile = width < 620
      const mobileScale = isPhone ? 0.48 : isMobile ? 0.6 : 1
      const baseY = orbitLocalY(width)

      snapshotRef.current = []

      ITEMS.forEach((item, index) => {
        const node = nodesRef.current[index]
        const image = node?.firstElementChild as HTMLImageElement | null
        if (!node || !image) return

        const angle = item.angle + time * item.speed
        const wave = Math.sin(time * 1.2 + item.phase) * 4
        const projected = projectAroundHeart(
          Math.cos(angle) * 410 * item.radius,
          baseY + Math.sin(angle) * 62 + item.yOffset * mobileScale + wave,
          Math.sin(angle) * 760 * item.radius,
          camera,
          center,
        )
        const front = Math.max(0, Math.min(1, 1.12 - projected.z / 620))
        const depthScale = 0.5 + front * 0.62
        const opacity = 0.24 + front * 0.74
        const blur = isMobile ? 0 : (1 - front) * 1.25
        const pinkGlow = isPhone ? 6 + front * 10 : 10 + front * 16
        const violetGlow = isPhone ? 12 + front * 14 : 22 + front * 28
        const rotate = Math.cos(angle) * item.tilt + Math.sin(time * 1.6 + item.phase) * 2.5
        const widthPx =
          item.size * mobileScale * (0.9 + camera.zoom * 0.1) * (0.78 + front * 0.22)

        node.style.transform = `translate3d(${projected.x}px, ${projected.y}px, 0) translate(-50%, -50%) scale(${depthScale}) rotate(${rotate}deg)`
        node.style.zIndex = front > 0.45 ? "3" : "0"
        image.style.width = `${widthPx}px`
        image.style.opacity = opacity.toFixed(3)
        image.style.background = "transparent"
        image.style.maxWidth = "none"
        image.style.filter = `${blur > 0 ? `blur(${blur.toFixed(2)}px) ` : ""}drop-shadow(0 0 ${pinkGlow}px rgba(255, 65, 130, ${0.28 + front * 0.4})) drop-shadow(0 0 ${violetGlow}px rgba(120, 95, 255, ${0.18 + front * 0.22}))`

        snapshotRef.current.push({ x: projected.x, y: projected.y })
      })

      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener("galaxy-camera-change", onCameraChange)
    ;(window as WindowWithOrbitDebug).__orbitingCouplesReady = true
    ;(window as WindowWithOrbitDebug).__orbitingCouplesCount = ITEMS.length
    ;(window as WindowWithOrbitDebug).__orbitingCoupleSnapshot = () => snapshotRef.current
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("galaxy-camera-change", onCameraChange)
      delete (window as WindowWithOrbitDebug).__orbitingCouplesReady
      delete (window as WindowWithOrbitDebug).__orbitingCouplesCount
      delete (window as WindowWithOrbitDebug).__orbitingCoupleSnapshot
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {ITEMS.map((item, index) => (
        <div
          key={item.id}
          ref={(node) => {
            nodesRef.current[index] = node
          }}
          className="absolute left-0 top-0 will-change-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="block h-auto select-none will-change-[filter,opacity,width]"
            src={item.src}
            alt={item.alt}
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}
