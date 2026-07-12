/** Defaults aligned with legacy PlayControlPanel / store. */
export const DEFAULT_STARTING_YEAR = -4000
export const DEFAULT_YEARS_PER_TURN = 10
/** Optional turn cap — empty in the UI means no maximumTurns on the session. */
export const DEFAULT_MAXIMUM_TURNS: number | null = null

export const GAME_NAME_MAX_LENGTH = 100

export const NEW_GAME_STEPS = [
  { id: 1 as const, label: 'Map' },
  { id: 2 as const, label: 'Civilizations' },
  { id: 3 as const, label: 'Game Settings' },
  { id: 4 as const, label: 'Review & Start' },
]

export type NewGameStepId = (typeof NEW_GAME_STEPS)[number]['id']
