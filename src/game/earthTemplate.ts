import { ResourceType } from './types'

export interface FracBox {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export interface ContinentSpec {
  name: string
  box: FracBox
  landRatio: number
  seedCount: number
}

export interface StraitSpec {
  name: string
  box: FracBox
}

export interface BridgeSpec {
  name: string
  x: number
  y: number
  radius: number
}

export interface DesertOverrideSpec {
  name: string
  box: FracBox
}

export interface MountainOverrideSpec {
  name: string
  points: { x: number; y: number }[]
  width: number
}

export interface LakeOverrideSpec {
  name: string
  x: number
  y: number
  size: number
}

export interface RiverOverrideSpec {
  name: string
  points: { x: number; y: number }[]
}

export interface ResourceBiasSpec {
  box: FracBox
  resource: ResourceType
  multiplier: number
}

// x: 0 = west edge of map, 1 = east edge. y: 0 = north edge, 1 = south edge.
// Europe is deliberately drawn much larger than its real proportions.
export const EARTH_CONTINENTS: ContinentSpec[] = [
  { name: 'North America', box: { xMin: 0.02, xMax: 0.30, yMin: 0.05, yMax: 0.55 }, landRatio: 0.55, seedCount: 5 },
  { name: 'Greenland', box: { xMin: 0.22, xMax: 0.32, yMin: 0.02, yMax: 0.17 }, landRatio: 0.6, seedCount: 1 },
  { name: 'South America', box: { xMin: 0.12, xMax: 0.32, yMin: 0.55, yMax: 0.95 }, landRatio: 0.5, seedCount: 4 },
  { name: 'Europe', box: { xMin: 0.34, xMax: 0.55, yMin: 0.06, yMax: 0.37 }, landRatio: 0.65, seedCount: 6 },
  { name: 'Africa', box: { xMin: 0.32, xMax: 0.55, yMin: 0.39, yMax: 0.85 }, landRatio: 0.55, seedCount: 5 },
  { name: 'Asia', box: { xMin: 0.50, xMax: 0.94, yMin: 0.04, yMax: 0.62 }, landRatio: 0.55, seedCount: 9 },
  { name: 'Australia', box: { xMin: 0.78, xMax: 0.95, yMin: 0.68, yMax: 0.90 }, landRatio: 0.5, seedCount: 2 },
  { name: 'Britain', box: { xMin: 0.28, xMax: 0.325, yMin: 0.10, yMax: 0.20 }, landRatio: 0.55, seedCount: 2 },
  { name: 'Japan', box: { xMin: 0.955, xMax: 0.99, yMin: 0.28, yMax: 0.44 }, landRatio: 0.45, seedCount: 2 },
]

export const EARTH_STRAITS: StraitSpec[] = [
  { name: 'Gibraltar', box: { xMin: 0.365, xMax: 0.40, yMin: 0.365, yMax: 0.385 } },
  { name: 'Bosphorus/Dardanelles', box: { xMin: 0.505, xMax: 0.535, yMin: 0.20, yMax: 0.235 } },
  { name: 'Gulf of Aden / Red Sea', box: { xMin: 0.53, xMax: 0.565, yMin: 0.50, yMax: 0.60 } },
]

export const EARTH_BRIDGES: BridgeSpec[] = [
  { name: 'Anatolia (Europe-Asia land bridge)', x: 0.535, y: 0.22, radius: 3 },
  { name: 'Sinai (Africa-Asia land bridge)', x: 0.545, y: 0.44, radius: 3 },
]

export const EARTH_DESERTS: DesertOverrideSpec[] = [
  { name: 'Sahara', box: { xMin: 0.33, xMax: 0.50, yMin: 0.40, yMax: 0.55 } },
]

export const EARTH_MOUNTAINS: MountainOverrideSpec[] = [
  { name: 'Himalayas', points: [{ x: 0.60, y: 0.43 }, { x: 0.66, y: 0.41 }, { x: 0.73, y: 0.39 }, { x: 0.79, y: 0.38 }], width: 2 },
  { name: 'Andes', points: [{ x: 0.16, y: 0.58 }, { x: 0.17, y: 0.68 }, { x: 0.18, y: 0.78 }, { x: 0.19, y: 0.90 }], width: 1 },
  { name: 'Alps', points: [{ x: 0.40, y: 0.31 }, { x: 0.43, y: 0.30 }, { x: 0.46, y: 0.30 }], width: 1 },
  { name: 'Rockies', points: [{ x: 0.10, y: 0.15 }, { x: 0.12, y: 0.28 }, { x: 0.14, y: 0.42 }], width: 1 },
]

export const EARTH_LAKES: LakeOverrideSpec[] = [
  { name: 'Baikal', x: 0.72, y: 0.24, size: 10 },
  { name: 'Victoria', x: 0.48, y: 0.62, size: 6 },
]

export const EARTH_RIVERS: RiverOverrideSpec[] = [
  { name: 'Nile', points: [{ x: 0.44, y: 0.42 }, { x: 0.43, y: 0.48 }, { x: 0.42, y: 0.55 }, { x: 0.41, y: 0.61 }] },
  { name: 'Amazon', points: [{ x: 0.14, y: 0.66 }, { x: 0.19, y: 0.65 }, { x: 0.25, y: 0.64 }, { x: 0.30, y: 0.63 }] },
  { name: 'Mississippi', points: [{ x: 0.16, y: 0.22 }, { x: 0.17, y: 0.30 }, { x: 0.18, y: 0.38 }, { x: 0.19, y: 0.46 }] },
]

export const EARTH_RESOURCE_BIAS: ResourceBiasSpec[] = [
  { box: { xMin: 0.53, xMax: 0.62, yMin: 0.40, yMax: 0.50 }, resource: 'oil', multiplier: 5 }, // Middle East
  { box: { xMin: 0.33, xMax: 0.50, yMin: 0.40, yMax: 0.55 }, resource: 'oil', multiplier: 2 }, // Sahara
  { box: { xMin: 0.33, xMax: 0.50, yMin: 0.40, yMax: 0.55 }, resource: 'niter', multiplier: 2 },
  { box: { xMin: 0.60, xMax: 0.90, yMin: 0.05, yMax: 0.28 }, resource: 'naturalGas', multiplier: 3 }, // Siberia
  { box: { xMin: 0.60, xMax: 0.90, yMin: 0.05, yMax: 0.28 }, resource: 'coal', multiplier: 2 },
  { box: { xMin: 0.14, xMax: 0.22, yMin: 0.55, yMax: 0.90 }, resource: 'silver', multiplier: 3 }, // Andes
  { box: { xMin: 0.14, xMax: 0.22, yMin: 0.55, yMax: 0.90 }, resource: 'gold', multiplier: 2 },
  { box: { xMin: 0.78, xMax: 0.95, yMin: 0.68, yMax: 0.90 }, resource: 'aluminum', multiplier: 2.5 }, // Australia
  { box: { xMin: 0.78, xMax: 0.95, yMin: 0.68, yMax: 0.90 }, resource: 'iron', multiplier: 2 },
  { box: { xMin: 0.40, xMax: 0.52, yMin: 0.55, yMax: 0.70 }, resource: 'gems', multiplier: 3 }, // Congo Basin
]
