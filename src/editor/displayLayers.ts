/** Editor display-layer visibility — UI-only; never persisted into MapTemplate. */

export interface EditorDisplayLayers {
  grid: boolean
  terrain: boolean
  features: boolean
  mountainsHills: boolean
  rivers: boolean
  resources: boolean
  cities: boolean
  ownershipFlags: boolean
}

export type EditorDisplayPreset = 'normal' | 'terrainOnly' | 'resourcesOnly' | 'citiesOnly' | 'relief'

export const DEFAULT_DISPLAY_LAYERS: EditorDisplayLayers = {
  grid: true,
  terrain: true,
  features: true,
  mountainsHills: true,
  rivers: true,
  resources: true,
  cities: true,
  ownershipFlags: true,
}

export const DISPLAY_PRESETS: Record<EditorDisplayPreset, EditorDisplayLayers> = {
  normal: { ...DEFAULT_DISPLAY_LAYERS },
  terrainOnly: {
    grid: true,
    terrain: true,
    features: false,
    mountainsHills: false,
    rivers: false,
    resources: false,
    cities: false,
    ownershipFlags: false,
  },
  resourcesOnly: {
    grid: true,
    terrain: true,
    features: false,
    mountainsHills: false,
    rivers: false,
    resources: true,
    cities: false,
    ownershipFlags: false,
  },
  citiesOnly: {
    grid: true,
    terrain: true,
    features: false,
    mountainsHills: false,
    rivers: false,
    resources: false,
    cities: true,
    ownershipFlags: true,
  },
  relief: {
    grid: true,
    terrain: true,
    features: true,
    mountainsHills: true,
    rivers: true,
    resources: false,
    cities: false,
    ownershipFlags: false,
  },
}

export function applyDisplayPreset(preset: EditorDisplayPreset): EditorDisplayLayers {
  return { ...DISPLAY_PRESETS[preset] }
}

export function toggleDisplayLayer(
  layers: EditorDisplayLayers,
  key: keyof EditorDisplayLayers,
): EditorDisplayLayers {
  return { ...layers, [key]: !layers[key] }
}
