import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../game/store'
import { axialToPixel, hexCorners, pixelToAxial, tileKey, HEX_SIZE } from '../game/hexGrid'
import { TerrainType } from '../game/types'

const TERRAIN_COLORS: Record<TerrainType, string> = {
  ocean: '#1e3a8a',
  coast: '#2563eb',
  lake: '#38bdf8',
  plains: '#d9c46a',
  grassland: '#65a30d',
  mountains: '#78716c',
  desert: '#d2691e',
  tundra: '#94a3b8',
  snow: '#f1f5f9',
}

interface Camera {
  x: number // мировые координаты (пиксели), что сейчас в центре экрана
  y: number
  zoom: number
}

const FALLBACK_CANVAS_WIDTH = 1600
const FALLBACK_CANVAS_HEIGHT = 900
const MIN_CANVAS_SIZE = 400
const HEIGHT_BUFFER_PX = 50
const MAX_VIEWPORT_HEIGHT_OFFSET = 100
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3

export function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const game = useGameStore((s) => s.game)
  const paintAt = useGameStore((s) => s.paintAt)

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.5 })
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: FALLBACK_CANVAS_WIDTH,
    height: FALLBACK_CANVAS_HEIGHT,
  })
  const draggingRef = useRef<{ startX: number; startY: number; camX: number; camY: number; moved: boolean } | null>(
    null,
  )
  const loggedSizeRef = useRef(false)

  function worldToScreen(wx: number, wy: number) {
    return {
      x: (wx - camera.x) * camera.zoom + canvasSize.width / 2,
      y: (wy - camera.y) * camera.zoom + canvasSize.height / 2,
    }
  }

  function screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - canvasSize.width / 2) / camera.zoom + camera.x,
      y: (sy - canvasSize.height / 2) / camera.zoom + camera.y,
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const computeSize = () => {
      const containerWidth = container.clientWidth
      if (containerWidth <= 0) return

      const top = container.getBoundingClientRect().top
      const availableBelowTop = window.innerHeight - top - HEIGHT_BUFFER_PX
      const maxHeight = window.innerHeight - MAX_VIEWPORT_HEIGHT_OFFSET

      let width = Math.floor(Math.min(containerWidth, container.getBoundingClientRect().width))
      let height = Math.floor(Math.min(availableBelowTop, maxHeight))

      if (!Number.isFinite(width) || !Number.isFinite(height)) return

      width = Math.max(MIN_CANVAS_SIZE, width)
      height = Math.max(MIN_CANVAS_SIZE, height)

      setCanvasSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))

      if (!loggedSizeRef.current) {
        loggedSizeRef.current = true
        console.log('canvasSize:', { width, height })
      }
    }

    computeSize()

    const ro = new ResizeObserver(() => computeSize())
    ro.observe(container)
    window.addEventListener('resize', computeSize)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', computeSize)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    const margin = HEX_SIZE * 2 * camera.zoom

    for (const key in game.tiles) {
      const tile = game.tiles[key]
      const world = axialToPixel(tile.coord)
      const screen = worldToScreen(world.x, world.y)

      // Отсечение: не рисуем то, что вне видимой области канваса
      if (
        screen.x < -margin ||
        screen.x > canvasSize.width + margin ||
        screen.y < -margin ||
        screen.y > canvasSize.height + margin
      ) {
        continue
      }

      const corners = hexCorners(world).map((c) => worldToScreen(c.x, c.y))

      ctx.beginPath()
      corners.forEach((c, i) => {
        if (i === 0) ctx.moveTo(c.x, c.y)
        else ctx.lineTo(c.x, c.y)
      })
      ctx.closePath()
      ctx.fillStyle = TERRAIN_COLORS[tile.terrain]
      ctx.fill()

      if (camera.zoom > 0.3) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      if (tile.terrain === 'mountains' && camera.zoom > 0.08) {
        ctx.font = `${16 * camera.zoom}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🗻', screen.x, screen.y)
        ctx.textBaseline = 'alphabetic'
      }

      if (tile.hasHills && camera.zoom > 0.08) {
        ctx.fillStyle = 'rgba(90, 60, 20, 0.45)'
        const bumpSize = 4 * camera.zoom
        const bx = screen.x - HEX_SIZE * camera.zoom * 0.5
        const by = screen.y + HEX_SIZE * camera.zoom * 0.45
        ctx.beginPath()
        ctx.moveTo(bx - bumpSize, by + bumpSize * 0.6)
        ctx.lineTo(bx - bumpSize * 0.3, by - bumpSize * 0.6)
        ctx.lineTo(bx + bumpSize * 0.4, by + bumpSize * 0.6)
        ctx.closePath()
        ctx.fill()
      }

      if (tile.riverDirections.length > 0 && camera.zoom > 0.08) {
        ctx.strokeStyle = '#1d4ed8'
        ctx.lineWidth = Math.max(1.5, 3 * camera.zoom)
        for (const dir of tile.riverDirections) {
          const edge = (6 - dir) % 6
          const c1 = corners[edge]
          const c2 = corners[(edge + 1) % 6]
          const midX = (c1.x + c2.x) / 2
          const midY = (c1.y + c2.y) / 2
          ctx.beginPath()
          ctx.moveTo(screen.x, screen.y)
          ctx.lineTo(midX, midY)
          ctx.stroke()
        }
      }

      if (tile.vegetation !== 'none' && camera.zoom > 0.08) {
        const cx = screen.x
        const cy = screen.y
        const s = 5 * camera.zoom
        if (tile.vegetation === 'forest' || tile.vegetation === 'jungle') {
          ctx.font = `${14 * camera.zoom}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(tile.vegetation === 'jungle' ? '🌴' : '🌲', cx, cy)
          ctx.textBaseline = 'alphabetic'
        } else if (tile.vegetation === 'swamp') {
          ctx.strokeStyle = 'rgba(21, 94, 117, 0.6)'
          ctx.lineWidth = Math.max(1, 1.5 * camera.zoom)
          for (const dy of [-s * 0.4, s * 0.4]) {
            ctx.beginPath()
            ctx.moveTo(cx - s, cy + dy)
            ctx.quadraticCurveTo(cx, cy + dy - s * 0.5, cx + s, cy + dy)
            ctx.stroke()
          }
        }
      }

      if (tile.resource !== 'none' && camera.zoom > 0.08) {
        ctx.fillStyle = '#000'
        ctx.font = `${10 * camera.zoom}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(tile.resource, screen.x, screen.y - 8 * camera.zoom)
      }

      if (tile.cityId) {
        ctx.beginPath()
        ctx.arc(screen.x, screen.y, Math.max(3, 8 * camera.zoom), 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = '#000'
        ctx.stroke()
      }
    }
  }, [game.tiles, camera, canvasSize])

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      camX: camera.x,
      camY: camera.y,
      moved: false,
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    setCamera((c) => ({ ...c, x: drag.camX - dx / c.zoom, y: drag.camY - dy / c.zoom }))
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current
    draggingRef.current = null
    if (!drag || drag.moved) return // это был пан, а не клик

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)
    const coord = pixelToAxial(world.x, world.y)
    const key = tileKey(coord)
    if (game.tiles[key]) {
      paintAt(key)
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setCamera((c) => ({ ...c, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor)) }))
  }

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          style={{
            border: '1px solid #333',
            boxSizing: 'border-box',
            cursor: 'grab',
            display: 'block',
            touchAction: 'none',
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            maxWidth: '100%',
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#666' }}>
        Тащи мышью — пан по карте. Колесо — зум. Клик (без перетаскивания) — покрасить гекс.
      </p>
    </div>
  )
}
