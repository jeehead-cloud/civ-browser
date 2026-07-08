import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../game/store'
import { axialToPixel, hexCorners, pixelToAxial, tileKey, HEX_SIZE } from '../game/hexGrid'
import { TerrainType } from '../game/types'

const TERRAIN_COLORS: Record<TerrainType, string> = {
  ocean: '#1e3a8a',
  coast: '#2563eb',
  plains: '#d9c46a',
  grassland: '#65a30d',
  hills: '#a16207',
  mountains: '#78716c',
  desert: '#eab308',
  tundra: '#94a3b8',
  snow: '#f1f5f9',
}

interface Camera {
  x: number // мировые координаты (пиксели), что сейчас в центре экрана
  y: number
  zoom: number
}

const CANVAS_WIDTH = 1100
const CANVAS_HEIGHT = 800
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3

export function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const game = useGameStore((s) => s.game)
  const paintAt = useGameStore((s) => s.paintAt)

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.5 })
  const draggingRef = useRef<{ startX: number; startY: number; camX: number; camY: number; moved: boolean } | null>(
    null,
  )

  function worldToScreen(wx: number, wy: number) {
    return {
      x: (wx - camera.x) * camera.zoom + CANVAS_WIDTH / 2,
      y: (wy - camera.y) * camera.zoom + CANVAS_HEIGHT / 2,
    }
  }

  function screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - CANVAS_WIDTH / 2) / camera.zoom + camera.x,
      y: (sy - CANVAS_HEIGHT / 2) / camera.zoom + camera.y,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const margin = HEX_SIZE * 2 * camera.zoom

    for (const key in game.tiles) {
      const tile = game.tiles[key]
      const world = axialToPixel(tile.coord)
      const screen = worldToScreen(world.x, world.y)

      // Отсечение: не рисуем то, что вне видимой области канваса
      if (
        screen.x < -margin ||
        screen.x > CANVAS_WIDTH + margin ||
        screen.y < -margin ||
        screen.y > CANVAS_HEIGHT + margin
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

      if (tile.resource !== 'none' && camera.zoom > 0.5) {
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
  }, [game.tiles, camera])

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
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{ border: '1px solid #333', cursor: 'grab', touchAction: 'none' }}
      />
      <p style={{ fontSize: 12, color: '#666' }}>
        Тащи мышью — пан по карте. Колесо — зум. Клик (без перетаскивания) — покрасить гекс.
      </p>
    </div>
  )
}
