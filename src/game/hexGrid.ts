import { AxialCoord } from './types'

// Плоская (flat-top) гекс-сетка, axial-координаты (q, r).
// Подробности системы: https://www.redblobgames.com/grids/hexagons/

export const HEX_SIZE = 32 // "радиус" гекса в пикселях

export function tileKey(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`
}

export function axialToPixel(coord: AxialCoord): { x: number; y: number } {
  const x = HEX_SIZE * ((3 / 2) * coord.q)
  const y = HEX_SIZE * ((Math.sqrt(3) / 2) * coord.q + Math.sqrt(3) * coord.r)
  return { x, y }
}

export function pixelToAxial(x: number, y: number): AxialCoord {
  const q = ((2 / 3) * x) / HEX_SIZE
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE
  return axialRound(q, r)
}

function axialRound(q: number, r: number): AxialCoord {
  let x = q
  let z = r
  let y = -x - z

  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)

  const xDiff = Math.abs(rx - x)
  const yDiff = Math.abs(ry - y)
  const zDiff = Math.abs(rz - z)

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz
  } else if (yDiff > zDiff) {
    ry = -rx - rz
  } else {
    rz = -rx - ry
  }

  return { q: rx, r: rz }
}

const DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function neighbors(coord: AxialCoord): AxialCoord[] {
  return DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }))
}

export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const aq = a.q
  const ar = a.r
  const bq = b.q
  const br = b.r
  return (
    (Math.abs(aq - bq) +
      Math.abs(aq + ar - bq - br) +
      Math.abs(ar - br)) /
    2
  )
}

// Углы шестиугольника (flat-top) для отрисовки на canvas
export function hexCorners(center: { x: number; y: number }): { x: number; y: number }[] {
  const corners = []
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i
    const angleRad = (Math.PI / 180) * angleDeg
    corners.push({
      x: center.x + HEX_SIZE * Math.cos(angleRad),
      y: center.y + HEX_SIZE * Math.sin(angleRad),
    })
  }
  return corners
}

// Генерирует прямоугольную область карты в axial-координатах
export function generateMapCoords(width: number, height: number): AxialCoord[] {
  const coords: AxialCoord[] = []
  for (let r = 0; r < height; r++) {
    const rOffset = Math.floor(r / 2)
    for (let q = -rOffset; q < width - rOffset; q++) {
      coords.push({ q, r })
    }
  }
  return coords
}
