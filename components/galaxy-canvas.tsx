"use client"

import { useEffect, useRef } from "react"

type GalaxyCanvasProps = {
  started: boolean
}

export function GalaxyCanvas({ started }: GalaxyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startedRef = useRef(started)

  useEffect(() => {
    startedRef.current = started
  }, [started])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let centerX = 0
    let centerY = 0
    let scale = 1
    let pointerPulse = 0
    let rafId = 0

    const view = {
      x: 0,
      y: 0,
      zoom: 1.08,
      rotation: -0.12,
      tilt: 0,
      dragging: false,
      pointerId: null as number | null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      originRotation: 0,
      originTilt: 0,
    }

    const rand = (min: number, max: number) => min + Math.random() * (max - min)
    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value))

    const palette = ["#7aa2ff", "#9d7bff", "#c89bff", "#ff7bb0", "#ffd6e8"]
    const heartPalette = ["#ff1f57", "#ff3d70", "#ff6f9c", "#ffc0d4", "#ffe3ee"]

    type HeartParticle = {
      x: number
      y: number
      z: number
      size: number
      twinkle: number
      speed: number
      color: string
    }
    type Spark = {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
      drag: number
      color: string
    }
    type TunnelDot = {
      angle: number
      radius: number
      depth: number
      speed: number
      size: number
      color: string
    }
    type FloorDot = {
      angle: number
      radius: number
      thickness: number
      size: number
      alpha: number
      twinkle: number
      spin: number
      color: string
    }

    const heartParticles: HeartParticle[] = []
    const sparks: Spark[] = []
    const tunnel: TunnelDot[] = []
    const floorDots: FloorDot[] = []
    const orbitWords = ["AMOR ETERNO", "PARA SIEMPRE", "INFINITO", "TE AMO"]

    const sceneX = () => centerX + view.x
    const sceneY = () => centerY + view.y
    const sceneS = () => scale * view.zoom
    const orbitLocalY = () => (width < 620 ? 72 : 84)

    function emitCamera() {
      window.dispatchEvent(
        new CustomEvent("galaxy-camera-change", {
          detail: {
            rotation: view.rotation,
            tilt: view.tilt,
            zoom: view.zoom,
            y: view.y,
            centerX: sceneX(),
            centerY: sceneY(),
            scale: sceneS(),
            viewportWidth: width,
            viewportHeight: height,
          },
        }),
      )
    }

    function projectAroundHeart(localX: number, localY: number, localZ: number) {
      const s = sceneS()
      const yaw = view.rotation
      const pitch = view.tilt
      const yawCos = Math.cos(yaw)
      const yawSin = Math.sin(yaw)
      const pitchCos = Math.cos(pitch)
      const pitchSin = Math.sin(pitch)
      const xYaw = localX * yawCos - localZ * yawSin
      const zYaw = localX * yawSin + localZ * yawCos
      const yPitch = localY * pitchCos - zYaw * pitchSin
      const zPitch = localY * pitchSin + zYaw * pitchCos
      const perspective = clamp(1 / (1 + zPitch / 980), 0.5, 1.55)
      return {
        x: sceneX() + xYaw * s * perspective,
        y: sceneY() + yPitch * s * perspective,
        scale: s * perspective,
        z: zPitch,
        perspective,
      }
    }

    function heartPoint(t: number) {
      const x = 16 * Math.pow(Math.sin(t), 3)
      const y =
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      return { x, y: -y }
    }

    function buildHeart() {
      heartParticles.length = 0
      const total = 1180
      for (let i = 0; i < total; i++) {
        const t = rand(0, Math.PI * 2)
        const base = heartPoint(t)
        const layer = Math.pow(Math.random(), 0.42)
        const depth = rand(-0.7, 0.9)
        heartParticles.push({
          x: base.x * layer + rand(-0.34, 0.34),
          y: base.y * layer + rand(-0.34, 0.34),
          z: depth,
          size: rand(0.9, 2.8),
          twinkle: rand(0, Math.PI * 2),
          speed: rand(0.45, 1.45),
          color: heartPalette[Math.floor(rand(0, heartPalette.length))],
        })
      }
      for (let i = 0; i < 330; i++) {
        const t = (i / 330) * Math.PI * 2
        const edge = heartPoint(t)
        heartParticles.push({
          x: edge.x + rand(-0.12, 0.12),
          y: edge.y + rand(-0.12, 0.12),
          z: rand(0.05, 0.65),
          size: rand(1.5, 3.2),
          twinkle: rand(0, Math.PI * 2),
          speed: rand(0.7, 1.7),
          color: heartPalette[Math.floor(rand(0, heartPalette.length))],
        })
      }
    }

    function buildTunnel() {
      tunnel.length = 0
      for (let i = 0; i < 850; i++) {
        tunnel.push({
          angle: rand(0, Math.PI * 2),
          radius: rand(0.02, 1.25),
          depth: rand(0.1, 1),
          speed: rand(0.07, 0.42),
          size: rand(0.7, 2.4),
          color: palette[Math.floor(rand(0, palette.length))],
        })
      }
    }

    function buildFloor() {
      floorDots.length = 0
      // Disco orbital de puntos, alineado con la misma orbita eliptica del corazon.
      for (let i = 0; i < 4200; i++) {
        const t = Math.pow(Math.random(), 0.6)
        const radius = 120 + t * 470
        const brightness = 1 - t * 0.55
        floorDots.push({
          angle: rand(0, Math.PI * 2),
          radius,
          thickness: rand(-26, 26),
          size: rand(0.5, 1.7),
          alpha: rand(0.2, 0.9) * brightness,
          twinkle: rand(0, Math.PI * 2),
          spin: rand(0.04, 0.16) * (0.6 + (1 - t)),
          color: palette[Math.floor(rand(0, palette.length))],
        })
      }
    }

    function addBurst(x: number, y: number, amount: number, power: number) {
      const mix = [...palette, ...heartPalette]
      for (let i = 0; i < amount; i++) {
        const angle = rand(0, Math.PI * 2)
        const speed = rand(0.5, power)
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: rand(0.52, 1.35),
          maxLife: rand(0.7, 1.35),
          size: rand(1.2, 4.2),
          drag: rand(0.965, 0.989),
          color: mix[Math.floor(rand(0, mix.length))],
        })
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = Math.floor(width * dpr)
      canvas!.height = Math.floor(height * dpr)
      canvas!.style.width = width + "px"
      canvas!.style.height = height + "px"
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      centerX = width * 0.5
      centerY = width < 620 ? height * 0.4 : height * 0.39
      scale = Math.min(width, height) / 760
      emitCamera()
    }

    function glowCircle(
      x: number,
      y: number,
      radius: number,
      color: string,
      alpha: number,
    ) {
      const gradient = ctx!.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, color)
      gradient.addColorStop(0.22, color)
      gradient.addColorStop(1, "rgba(255, 0, 30, 0)")
      ctx!.globalAlpha = alpha
      ctx!.fillStyle = gradient
      ctx!.beginPath()
      ctx!.arc(x, y, radius, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.globalAlpha = 1
    }

    function drawBackground(time: number) {
      ctx!.clearRect(0, 0, width, height)
      const cx = sceneX()
      const cy = sceneY()
      const s = sceneS()
      const bg = ctx!.createRadialGradient(
        cx,
        cy + 150 * s,
        0,
        cx,
        cy + 150 * s,
        Math.max(width, height) * 0.72,
      )
      bg.addColorStop(0, "rgba(40, 22, 90, 0.55)")
      bg.addColorStop(0.34, "rgba(10, 6, 34, 0.97)")
      bg.addColorStop(1, "#05010f")
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, width, height)

      glowCircle(
        cx - 420 * s,
        cy + 205 * s + Math.sin(time * 0.7) * 10 * s,
        155 * s,
        "rgba(120, 100, 255, 0.2)",
        0.42,
      )
      glowCircle(
        cx + 430 * s,
        cy + 190 * s + Math.cos(time * 0.64) * 10 * s,
        150 * s,
        "rgba(180, 120, 255, 0.18)",
        0.36,
      )
    }

    function drawTunnel(time: number, intensity: number) {
      if (intensity <= 0.01) return
      const cx = sceneX()
      const cy = sceneY()
      const s = sceneS()
      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"
      tunnel.forEach((p) => {
        p.depth -= p.speed * 0.012
        if (p.depth < 0.05) {
          p.depth = 1
          p.radius = rand(0.02, 1.25)
          p.angle = rand(0, Math.PI * 2)
        }
        const spin = time * 0.5
        const perspective = 1 / p.depth
        const radius = p.radius * Math.min(width, height) * 0.25 * perspective * view.zoom
        const x = cx + Math.cos(p.angle + spin) * radius
        const y = cy + 30 * s + Math.sin(p.angle + spin) * radius * 0.42
        const alpha = clamp((1.1 - p.depth) * intensity, 0, 0.16)
        const size = p.size * perspective * s * 0.46
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = p.color
        ctx!.beginPath()
        ctx!.arc(x, y, size, 0, Math.PI * 2)
        ctx!.fill()
      })
      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    function drawParticleFloor(time: number, intensity: number) {
      if (intensity <= 0.01) return
      const s = sceneS()
      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"
      // Plano orbital: el mismo centro y squash que usan el corazon y las palabras.
      const orbitCenterY = orbitLocalY()
      floorDots.forEach((p) => {
        const angle = p.angle + time * p.spin
        const localX = Math.cos(angle) * p.radius
        // achatamos en Y para que sea una orbita eliptica (mirando el disco en perspectiva)
        const localY = orbitCenterY + Math.sin(angle) * p.radius * 0.2 + p.thickness
        const localZ = Math.sin(angle) * p.radius * 1.9
        const projected = projectAroundHeart(localX, localY, localZ)
        const front = clamp(1.1 - projected.z / 700, 0, 1)
        const tw = 0.6 + Math.sin(time * 1.6 + p.twinkle) * 0.4
        const alpha = p.alpha * intensity * (0.25 + front * 0.85) * tw
        const size = p.size * projected.scale * (0.5 + front * 1.1)
        ctx!.globalAlpha = clamp(alpha, 0, 1)
        ctx!.fillStyle = p.color
        ctx!.beginPath()
        ctx!.arc(projected.x, projected.y, size, 0, Math.PI * 2)
        ctx!.fill()
      })
      const glowProj = projectAroundHeart(0, orbitCenterY, 0)
      const glow = ctx!.createRadialGradient(
        glowProj.x,
        glowProj.y,
        0,
        glowProj.x,
        glowProj.y,
        320 * s,
      )
      glow.addColorStop(0, "rgba(125, 110, 255, 0.2)")
      glow.addColorStop(0.42, "rgba(110, 90, 255, 0.06)")
      glow.addColorStop(1, "rgba(110, 90, 255, 0)")
      ctx!.globalAlpha = 0.6 * intensity
      ctx!.fillStyle = glow
      ctx!.fillRect(glowProj.x - 360 * s, glowProj.y - 120 * s, 720 * s, 300 * s)
      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    function drawPortal(time: number, intensity: number) {
      if (intensity <= 0.01) return
      const s = sceneS()
      const localBaseY = orbitLocalY()
      const baseProjection = projectAroundHeart(0, localBaseY, 0)
      const heartProjection = projectAroundHeart(0, -42, 0)
      const baseR = 150 * s
      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"

      for (let arm = 0; arm < 2; arm++) {
        ctx!.lineWidth = 1.05 * s
        ctx!.strokeStyle = `rgba(140, 120, 255, ${0.3 * intensity})`
        ctx!.beginPath()
        for (let i = 0; i < 210; i++) {
          const t = i / 209
          const angle = arm * Math.PI + t * Math.PI * 3.25 + time * 0.24
          const radius = 24 + t * 250
          const projected = projectAroundHeart(
            Math.cos(angle) * radius,
            localBaseY + Math.sin(angle) * radius * 0.18,
            Math.sin(angle) * radius * 2.1,
          )
          if (i === 0) ctx!.moveTo(projected.x, projected.y)
          else ctx!.lineTo(projected.x, projected.y)
        }
        ctx!.stroke()
      }

      for (let ring = 0; ring < 9; ring++) {
        const radius = 150 + ring * 24 + Math.sin(time * 1.7 + ring) * 8
        const alpha = (0.48 - ring * 0.042) * intensity
        ctx!.lineWidth = (2.3 - ring * 0.13) * s
        ctx!.strokeStyle = `rgba(130, 110, 255, ${alpha})`
        ctx!.beginPath()
        for (let i = 0; i <= 180; i++) {
          const angle = (i / 180) * Math.PI * 2
          const projected = projectAroundHeart(
            Math.cos(angle) * radius,
            localBaseY + Math.sin(angle) * radius * 0.195,
            Math.sin(angle) * radius * 2.1,
          )
          if (i === 0) ctx!.moveTo(projected.x, projected.y)
          else ctx!.lineTo(projected.x, projected.y)
        }
        ctx!.stroke()
        ctx!.lineWidth = 0.9 * s
        ctx!.strokeStyle = `rgba(200, 170, 255, ${alpha * 0.8})`
        ctx!.beginPath()
        for (let i = 0; i <= 150; i++) {
          const angle = (i / 150) * Math.PI * 2
          const projected = projectAroundHeart(
            Math.cos(angle) * radius * 0.72,
            localBaseY + Math.sin(angle) * radius * 0.12,
            Math.sin(angle) * radius * 1.5,
          )
          if (i === 0) ctx!.moveTo(projected.x, projected.y)
          else ctx!.lineTo(projected.x, projected.y)
        }
        ctx!.stroke()
      }

      for (let i = 0; i < 170; i++) {
        const angle = i * 0.42 + time * (0.55 + (i % 5) * 0.04)
        const radius = 150 + Math.sin(i * 2.1) * 55
        const z = (Math.sin(angle) + 1) * 0.5
        const projected = projectAroundHeart(
          Math.cos(angle) * radius,
          localBaseY + Math.sin(angle) * radius * 0.18 - z * 9,
          Math.sin(angle) * radius * 2.1,
        )
        const alpha = (0.18 + z * 0.7) * intensity * projected.perspective
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = i % 9 === 0 ? "#ffe3ee" : palette[i % palette.length]
        ctx!.beginPath()
        ctx!.arc(projected.x, projected.y, (1.2 + z * 2.2) * projected.scale, 0, Math.PI * 2)
        ctx!.fill()
      }

      const beam = ctx!.createLinearGradient(
        heartProjection.x,
        heartProjection.y,
        baseProjection.x,
        baseProjection.y,
      )
      beam.addColorStop(0, "rgba(120, 100, 255, 0)")
      beam.addColorStop(0.42, `rgba(150, 120, 255, ${0.36 * intensity})`)
      beam.addColorStop(1, "rgba(120, 100, 255, 0)")
      ctx!.globalAlpha = 1
      ctx!.strokeStyle = beam
      ctx!.lineWidth = 36 * s * baseProjection.perspective
      ctx!.lineCap = "round"
      ctx!.beginPath()
      ctx!.moveTo(heartProjection.x, heartProjection.y)
      ctx!.lineTo(baseProjection.x, baseProjection.y)
      ctx!.stroke()

      glowCircle(
        baseProjection.x,
        baseProjection.y,
        120 * s * baseProjection.perspective,
        "rgba(120, 90, 255, 0.62)",
        0.42 * intensity,
      )
      glowCircle(
        baseProjection.x,
        baseProjection.y,
        38 * s * baseProjection.perspective,
        "rgba(255, 220, 240, 0.94)",
        0.34 * intensity,
      )

      ctx!.save()
      ctx!.globalCompositeOperation = "source-over"
      ctx!.shadowColor = "#9d7bff"
      ctx!.shadowBlur = 18 * s
      ctx!.fillStyle = "rgba(245, 240, 255, 0.95)"
      ctx!.beginPath()
      ctx!.ellipse(
        baseProjection.x,
        baseProjection.y - 5 * s,
        43 * s * baseProjection.perspective,
        15 * s * baseProjection.perspective,
        -0.08,
        0,
        Math.PI * 2,
      )
      ctx!.fill()
      ctx!.shadowBlur = 0
      ctx!.fillStyle = "#08051a"
      ctx!.beginPath()
      ctx!.ellipse(
        baseProjection.x,
        baseProjection.y - 7 * s,
        25 * s * baseProjection.perspective,
        10 * s * baseProjection.perspective,
        -0.08,
        0,
        Math.PI * 2,
      )
      ctx!.fill()
      ctx!.restore()

      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    function drawHeart(time: number, intensity: number) {
      if (intensity <= 0.01) return
      const cx = sceneX()
      const cy = sceneY()
      const s = sceneS()
      const heartScale =
        14.2 * s * (1 + Math.sin(time * 2.5) * 0.022 + pointerPulse * 0.035)
      const heartX = cx
      const heartY = cy - 230 * s
      const rotate = Math.sin(time * 0.42) * 0.065
      const cos = Math.cos(rotate)
      const sin = Math.sin(rotate)

      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"
      glowCircle(heartX, heartY + 20 * s, 170 * s, "rgba(255, 31, 87, 0.5)", 0.34 * intensity)

      heartParticles.forEach((p) => {
        const depthScale = 1 + p.z * 0.1 + Math.sin(time * p.speed + p.twinkle) * 0.018
        const px = p.x * heartScale * depthScale
        const py = p.y * heartScale * depthScale
        const x = heartX + px * cos - py * sin
        const y =
          heartY + px * sin + py * cos + Math.sin(time * p.speed + p.twinkle) * 1.4 * s
        const twinkle = 0.55 + Math.sin(time * 4.8 * p.speed + p.twinkle) * 0.35
        const alpha = clamp((0.28 + twinkle) * intensity, 0, 1)
        const size = (p.size + pointerPulse * 1.1) * s * (1 + p.z * 0.2)
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = p.color
        ctx!.beginPath()
        ctx!.arc(x, y, size, 0, Math.PI * 2)
        ctx!.fill()
      })

      ctx!.lineWidth = 4.6 * s
      ctx!.strokeStyle = `rgba(255, 35, 88, ${0.52 * intensity})`
      ctx!.shadowColor = "#ff1f57"
      ctx!.shadowBlur = 32 * s
      ctx!.beginPath()
      for (let i = 0; i <= 240; i++) {
        const p = heartPoint((i / 240) * Math.PI * 2)
        const px = p.x * heartScale * 1.04
        const py = p.y * heartScale * 1.04
        const x = heartX + px * cos - py * sin
        const y = heartY + px * sin + py * cos
        if (i === 0) ctx!.moveTo(x, y)
        else ctx!.lineTo(x, y)
      }
      ctx!.stroke()
      ctx!.shadowBlur = 0
      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    function drawOrbitText(time: number, intensity: number) {
      if (intensity <= 0.01) return
      const s = sceneS()
      const total = width < 620 ? 22 : 34
      const fontSize = width < 620 ? Math.max(6, 10 * s) : Math.max(8, 12 * s)
      ctx!.save()
      ctx!.textAlign = "center"
      ctx!.textBaseline = "middle"
      ctx!.globalCompositeOperation = "lighter"

      for (let i = 0; i < total; i++) {
        const label = orbitWords[i % orbitWords.length]
        const angle = (i / total) * Math.PI * 2 + time * 0.32
        const projected = projectAroundHeart(
          Math.cos(angle) * 390,
          orbitLocalY() + Math.sin(angle) * 58,
          Math.sin(angle) * 790,
        )
        const front = clamp(1.15 - projected.z / 620, 0, 1)
        const alpha = (0.12 + front * 0.78) * intensity
        ctx!.save()
        ctx!.translate(projected.x, projected.y)
        ctx!.rotate(Math.cos(angle) * 0.18)
        ctx!.scale(0.72 + front * 0.44, 0.72 + front * 0.22)
        ctx!.font = `${fontSize * projected.perspective}px Arial, sans-serif`
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = front > 0.45 ? "#c5b3ff" : "#5a4aa0"
        ctx!.shadowColor = "#9d7bff"
        ctx!.shadowBlur = 14 * projected.scale
        ctx!.fillText(label, 0, 0)
        ctx!.restore()
      }

      const frontLabels = [
        { text: "INFINITO \u221e", x: 95, y: orbitLocalY() + 136, z: -560, rot: -0.03, size: 30 },
        { text: "AMOR DE MI VIDA", x: 290, y: orbitLocalY() + 70, z: -420, rot: 0.08, size: 21 },
        { text: "AMOR ETERNO", x: -385, y: orbitLocalY() + 28, z: -250, rot: -0.06, size: 18 },
        { text: "INFINITO", x: -300, y: orbitLocalY() - 34, z: 110, rot: -0.03, size: 12 },
        { text: "TE AMO", x: 350, y: orbitLocalY() - 42, z: 210, rot: 0.05, size: 11 },
      ]
      frontLabels.forEach((item, index) => {
        const wobble = Math.sin(time * 1.1 + index) * 4 * s
        const projected = projectAroundHeart(item.x, item.y + wobble / s, item.z)
        const front = clamp(1.18 - projected.z / 650, 0, 1)
        ctx!.save()
        ctx!.translate(projected.x, projected.y)
        ctx!.rotate(item.rot)
        ctx!.scale(1.05, 0.88)
        ctx!.font = `${item.size * projected.scale}px Arial, sans-serif`
        ctx!.globalAlpha = (index < 2 ? 0.95 : 0.66) * intensity * (0.65 + front * 0.35)
        ctx!.fillStyle = index < 2 ? "#ffe0ec" : "#b89bff"
        ctx!.shadowColor = "#ff3d70"
        ctx!.shadowBlur = (index < 2 ? 18 : 12) * projected.scale
        ctx!.fillText(item.text, 0, 0)
        ctx!.restore()
      })

      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    function drawSparks(delta: number) {
      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]
        p.life -= delta
        p.x += p.vx * 60 * delta
        p.y += p.vy * 60 * delta
        p.vx *= p.drag
        p.vy = p.vy * p.drag + 0.012
        if (p.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        const alpha = clamp(p.life / p.maxLife, 0, 1)
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = p.color
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size * scale * (0.7 + alpha), 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    function drawFloatingHearts(time: number, intensity: number) {
      if (intensity <= 0.01) return
      ctx!.save()
      ctx!.globalCompositeOperation = "lighter"
      ctx!.fillStyle = "#ff3d70"

      function drawSmallHeart(
        x: number,
        y: number,
        size: number,
        rotation: number,
        alpha: number,
      ) {
        ctx!.save()
        ctx!.translate(x, y)
        ctx!.rotate(rotation)
        ctx!.globalAlpha = alpha * intensity
        ctx!.shadowColor = "#ff3d70"
        ctx!.shadowBlur = 16 * size
        ctx!.beginPath()
        ctx!.moveTo(0, size * 0.42)
        ctx!.bezierCurveTo(-size * 1.55, -size * 0.55, -size * 0.82, -size * 1.72, 0, -size * 0.74)
        ctx!.bezierCurveTo(size * 0.82, -size * 1.72, size * 1.55, -size * 0.55, 0, size * 0.42)
        ctx!.fill()
        ctx!.restore()
      }

      const hearts = [
        { x: -540, y: orbitLocalY() + 48, z: -320, size: 27, alpha: 0.78 },
        { x: -455, y: orbitLocalY() - 22, z: 150, size: 16, alpha: 0.72 },
        { x: 120, y: orbitLocalY() + 112, z: -530, size: 18, alpha: 0.8 },
        { x: 260, y: orbitLocalY() - 44, z: 40, size: 15, alpha: 0.74 },
        { x: 455, y: orbitLocalY() + 12, z: -110, size: 22, alpha: 0.78 },
        { x: 350, y: orbitLocalY() + 160, z: -460, size: 14, alpha: 0.68 },
      ]
      hearts.forEach((item, index) => {
        const projected = projectAroundHeart(item.x, item.y + Math.sin(time + index) * 4, item.z)
        drawSmallHeart(
          projected.x,
          projected.y,
          item.size * projected.scale,
          Math.sin(time * 0.7 + index) * 0.12,
          item.alpha * clamp(projected.perspective, 0.45, 1.2),
        )
      })
      ctx!.restore()
      ctx!.globalAlpha = 1
    }

    let lastTime = performance.now()
    let lastBurstBeat = -1

    function animate(now: number) {
      const time = now / 1000
      const delta = Math.min(0.034, (now - lastTime) / 1000)
      lastTime = now
      const pulse = 0.92 + Math.sin(time * 1.7) * 0.08
      pointerPulse = Math.max(0, pointerPulse - delta * 1.6)

      drawBackground(time)
      drawTunnel(time, 0.04)
      drawParticleFloor(time, 1)
      drawPortal(time, pulse)
      drawOrbitText(time, 1)
      drawFloatingHearts(time, 0.95)
      drawSparks(delta)

      const beat = Math.floor(time * 1.9)
      if (beat !== lastBurstBeat) {
        lastBurstBeat = beat
        const burstPoint = projectAroundHeart(0, orbitLocalY(), 0)
        addBurst(burstPoint.x, burstPoint.y, 18, 2.6 * sceneS())
      }
      rafId = requestAnimationFrame(animate)
    }

    function moveZoomToward(clientX: number, clientY: number, nextZoom: number) {
      const previousZoom = view.zoom
      const oldSceneX = sceneX()
      const oldSceneY = sceneY()
      view.zoom = clamp(nextZoom, 0.55, 2.35)
      const ratio = view.zoom / previousZoom
      const newSceneX = clientX - (clientX - oldSceneX) * ratio
      const newSceneY = clientY - (clientY - oldSceneY) * ratio
      view.x = newSceneX - centerX
      view.y = newSceneY - centerY
    }

    function endDrag(event: PointerEvent) {
      if (!view.dragging || event.pointerId !== view.pointerId) return
      view.dragging = false
      view.pointerId = null
      document.body.classList.remove("dragging")
      try {
        canvas!.releasePointerCapture(event.pointerId)
      } catch {
        // already released
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      view.dragging = true
      view.pointerId = event.pointerId
      view.startX = event.clientX
      view.startY = event.clientY
      view.originX = view.x
      view.originY = view.y
      view.originRotation = view.rotation
      view.originTilt = view.tilt
      document.body.classList.add("dragging")
      canvas!.setPointerCapture(event.pointerId)
      pointerPulse = 1
      addBurst(event.clientX, event.clientY, 54, 4.3 * sceneS())
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!view.dragging || event.pointerId !== view.pointerId) return
      const dx = event.clientX - view.startX
      const dy = event.clientY - view.startY
      view.rotation = view.originRotation + dx * 0.012
      view.y = view.originY
      view.tilt = clamp(view.originTilt + dy * 0.0065, -0.82, 0.82)
      emitCamera()
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction = event.deltaY < 0 ? 1.1 : 0.9
      moveZoomToward(event.clientX, event.clientY, view.zoom * direction)
      emitCamera()
    }

    const onDblClick = (event: MouseEvent) => {
      event.preventDefault()
      view.x = 0
      view.y = 0
      view.zoom = 1.08
      view.rotation = -0.12
      view.tilt = 0
      pointerPulse = 1
      emitCamera()
      const burstPoint = projectAroundHeart(0, orbitLocalY(), 0)
      addBurst(burstPoint.x, burstPoint.y, 100, 4.6 * sceneS())
    }

    window.addEventListener("resize", resize)
    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerup", endDrag)
    canvas.addEventListener("pointercancel", endDrag)
    canvas.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("dblclick", onDblClick)

    resize()
    buildTunnel()
    buildFloor()
    emitCamera()
    const firstBurstPoint = projectAroundHeart(0, orbitLocalY(), 0)
    addBurst(firstBurstPoint.x, firstBurstPoint.y, 160, 5.2 * sceneS())
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", endDrag)
      canvas.removeEventListener("pointercancel", endDrag)
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("dblclick", onDblClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 block h-full w-full cursor-grab touch-none"
      aria-label="Animacion de galaxia de amor eterno"
    />
  )
}
