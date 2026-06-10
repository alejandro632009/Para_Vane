"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type Heart3DProps = {
  started: boolean
}

type CameraState = {
  rotation: number
  tilt: number
  zoom: number
  y: number
  scale: number
  centerX: number
  centerY: number
  viewportWidth: number
  viewportHeight: number
}

type WindowWithHeartDebug = Window & {
  __heart3dReady?: boolean
  __heart3dPointCount?: number
}

const CAMERA_DEFAULT: CameraState = {
  rotation: -0.12,
  tilt: 0,
  zoom: 1.08,
  y: 0,
  scale: 1,
  centerX: 0,
  centerY: 0,
  viewportWidth: 0,
  viewportHeight: 0,
}

const heartBaseY = (width: number) => (width < 620 ? 0.52 : 0.68)
const sceneBaseY = (width: number, height: number) => (width < 620 ? height * 0.4 : height * 0.39)
const heartLightLocalY = (width: number) => (width < 620 ? -52 : -46)

function projectScenePoint(
  localX: number,
  localY: number,
  localZ: number,
  camera: CameraState,
  fallbackWidth: number,
  fallbackHeight: number,
) {
  const viewportWidth = camera.viewportWidth || fallbackWidth
  const viewportHeight = camera.viewportHeight || fallbackHeight
  const centerX = camera.centerX || viewportWidth * 0.5
  const centerY = camera.centerY || sceneBaseY(viewportWidth, viewportHeight)
  const sceneScale = camera.scale || (Math.min(viewportWidth, viewportHeight) / 760) * camera.zoom
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
    x: centerX + xYaw * sceneScale * perspective,
    y: centerY + yPitch * sceneScale * perspective,
    perspective,
  }
}

function makeDotTexture() {
  const size = 96
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255,255,255,1)")
  gradient.addColorStop(0.24, "rgba(255,230,238,0.98)")
  gradient.addColorStop(0.62, "rgba(255,80,130,0.42)")
  gradient.addColorStop(1, "rgba(255,0,70,0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function heartPoint(t: number) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return { x: x / 18, y: y / 18 }
}

function makeHeartGeometry(count: number, edge = false) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const colorA = new THREE.Color("#ff1f57")
  const colorB = new THREE.Color("#ff8fb0")
  const colorC = new THREE.Color("#ffe2eb")
  const scratch = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const t = edge ? (i / count) * Math.PI * 2 : Math.random() * Math.PI * 2
    const base = heartPoint(t)
    const fill = edge ? 1 : Math.pow(Math.random(), 0.38)
    const shell = edge ? 0.03 : 0.24 + fill * 0.16
    const depth = (Math.random() - 0.5) * shell

    const x = base.x * fill + (Math.random() - 0.5) * (edge ? 0.012 : 0.028)
    const y = base.y * fill + (Math.random() - 0.5) * (edge ? 0.012 : 0.028)
    const z = depth * (0.45 + fill)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    scratch.copy(Math.random() > 0.16 ? colorA : colorB).lerp(colorC, edge ? 0.08 : Math.random() * 0.22)
    colors[i * 3] = scratch.r
    colors[i * 3 + 1] = scratch.g
    colors[i * 3 + 2] = scratch.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  return geometry
}

function makeHeartMeshGeometry() {
  const shape = new THREE.Shape()

  for (let i = 0; i <= 220; i++) {
    const point = heartPoint((i / 220) * Math.PI * 2)
    if (i === 0) {
      shape.moveTo(point.x, point.y)
    } else {
      shape.lineTo(point.x, point.y)
    }
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelSegments: 10,
    bevelSize: 0.035,
    bevelThickness: 0.08,
    steps: 1,
  })
  geometry.translate(0, 0, -0.16)
  geometry.computeVertexNormals()
  return geometry
}

export function Heart3D({ started }: Heart3DProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(started)

  useEffect(() => {
    startedRef.current = started
  }, [started])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.display = "block"
    renderer.domElement.style.height = "100%"
    renderer.domElement.style.width = "100%"
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
    camera.position.set(0, 0, 10)

    const ambientLight = new THREE.AmbientLight("#ffd6e5", 0.8)
    const keyLight = new THREE.PointLight("#ff5f93", 3.2, 12)
    keyLight.position.set(-1.8, 2.6, 4.8)
    const rimLight = new THREE.PointLight("#9d7bff", 2.4, 12)
    rimLight.position.set(2.2, 1.1, 5.4)
    scene.add(ambientLight, keyLight, rimLight)

    const group = new THREE.Group()
    scene.add(group)

    const dotTexture = makeDotTexture()
    const meshGeometry = makeHeartMeshGeometry()
    const mainGeometry = makeHeartGeometry(4600)
    const edgeGeometry = makeHeartGeometry(1200, true)

    const meshMaterial = new THREE.MeshStandardMaterial({
      color: "#ff1f57",
      emissive: "#ff245f",
      emissiveIntensity: 0.68,
      metalness: 0.02,
      opacity: 0.34,
      roughness: 0.38,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    })
    const mainMaterial = new THREE.PointsMaterial({
      size: 0.045,
      map: dotTexture ?? undefined,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const edgeMaterial = new THREE.PointsMaterial({
      size: 0.064,
      map: dotTexture ?? undefined,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const heartMesh = new THREE.Mesh(meshGeometry, meshMaterial)
    heartMesh.position.z = -0.1
    const mainPoints = new THREE.Points(mainGeometry, mainMaterial)
    const edgePoints = new THREE.Points(edgeGeometry, edgeMaterial)
    group.add(heartMesh, mainPoints, edgePoints)

    const glowTexture = makeDotTexture()
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture ?? undefined,
        color: "#ff315f",
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    glow.scale.set(4.2, 4.2, 1)
    glow.position.set(0, -0.05, -0.45)
    group.add(glow)

    const target = { ...CAMERA_DEFAULT }
    const current = { ...CAMERA_DEFAULT }

    function applyCameraEvent(event: Event) {
      const detail = (event as CustomEvent<Partial<CameraState>>).detail ?? {}
      const needsInitialSceneCenter = target.viewportWidth === 0 || target.viewportHeight === 0
      target.rotation = detail.rotation ?? target.rotation
      target.tilt = detail.tilt ?? target.tilt
      target.zoom = detail.zoom ?? target.zoom
      target.y = detail.y ?? target.y
      target.scale = detail.scale ?? target.scale
      target.centerX = detail.centerX ?? target.centerX
      target.centerY = detail.centerY ?? target.centerY
      target.viewportWidth = detail.viewportWidth ?? target.viewportWidth
      target.viewportHeight = detail.viewportHeight ?? target.viewportHeight

      if (
        needsInitialSceneCenter &&
        detail.centerX !== undefined &&
        detail.centerY !== undefined &&
        detail.viewportWidth !== undefined &&
        detail.viewportHeight !== undefined
      ) {
        current.centerX = target.centerX
        current.centerY = target.centerY
        current.scale = target.scale
        current.viewportWidth = target.viewportWidth
        current.viewportHeight = target.viewportHeight
      }
    }

    function resize() {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setSize(width, height, false)
      const aspect = width / Math.max(1, height)
      const viewHeight = 10
      camera.left = (-viewHeight * aspect) / 2
      camera.right = (viewHeight * aspect) / 2
      camera.top = viewHeight / 2
      camera.bottom = -viewHeight / 2
      camera.updateProjectionMatrix()

      const responsiveScale = width < 620 ? 2.08 : 1.78
      group.scale.setScalar(responsiveScale * current.zoom)
      group.position.y = heartBaseY(width)
      group.position.x = 0
    }

    let rafId = 0
    function animate(timeMs: number) {
      const time = timeMs / 1000
      current.rotation += (target.rotation - current.rotation) * 0.08
      current.tilt += (target.tilt - current.tilt) * 0.08
      current.zoom += (target.zoom - current.zoom) * 0.08
      current.y += (target.y - current.y) * 0.08
      current.scale += (target.scale - current.scale) * 0.08
      current.centerX += (target.centerX - current.centerX) * 0.08
      current.centerY += (target.centerY - current.centerY) * 0.08
      current.viewportWidth += (target.viewportWidth - current.viewportWidth) * 0.08
      current.viewportHeight += (target.viewportHeight - current.viewportHeight) * 0.08

      const width = window.innerWidth
      const height = window.innerHeight
      const responsiveScale = width < 620 ? 2.08 : 1.78
      const activeScale = startedRef.current ? 1 : 0.72
      const anchor = projectScenePoint(0, heartLightLocalY(width), 0, current, width, height)
      const worldPerPixel = 10 / Math.max(1, height)

      group.scale.setScalar(responsiveScale * current.zoom * activeScale * anchor.perspective)
      group.position.x = (anchor.x - width * 0.5) * worldPerPixel
      group.position.y = (height * 0.5 - anchor.y) * worldPerPixel
      group.rotation.y = current.rotation * 0.18 + Math.sin(time * 0.38) * 0.07
      group.rotation.x = -0.1 + current.tilt * 0.24 + Math.sin(time * 0.52) * 0.035
      group.rotation.z = Math.sin(time * 0.44) * 0.025

      mainMaterial.opacity = startedRef.current ? 0.92 : 0
      edgeMaterial.opacity = startedRef.current ? 1 : 0
      meshMaterial.opacity = startedRef.current ? 0.34 : 0
      ;(glow.material as THREE.SpriteMaterial).opacity = startedRef.current ? 0.22 : 0

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }

    resize()
    ;(window as WindowWithHeartDebug).__heart3dReady = true
    ;(window as WindowWithHeartDebug).__heart3dPointCount = 5800
    window.addEventListener("resize", resize)
    window.addEventListener("galaxy-camera-change", applyCameraEvent)
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      window.removeEventListener("galaxy-camera-change", applyCameraEvent)
      delete (window as WindowWithHeartDebug).__heart3dReady
      delete (window as WindowWithHeartDebug).__heart3dPointCount
      meshGeometry.dispose()
      mainGeometry.dispose()
      edgeGeometry.dispose()
      meshMaterial.dispose()
      mainMaterial.dispose()
      edgeMaterial.dispose()
      dotTexture?.dispose()
      glowTexture?.dispose()
      ;(glow.material as THREE.SpriteMaterial).dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full transition-opacity duration-300"
      aria-hidden="true"
    />
  )
}
