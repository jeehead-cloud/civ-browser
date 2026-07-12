import type { CivBrowserDatabase } from '../database'
import { createCivilizationRepository } from './civilizationRepository'
import { createGameSessionRepository } from './gameSessionRepository'
import { createMapRepository } from './mapRepository'
import { createRulesPresetRepository } from './rulesPresetRepository'
import type { PersistenceServices } from './types'

export type {
  MapRepository,
  CivilizationRepository,
  RulesPresetRepository,
  GameSessionRepository,
  PersistenceServices,
} from './types'

export { createMapRepository } from './mapRepository'
export { createCivilizationRepository } from './civilizationRepository'
export { createRulesPresetRepository } from './rulesPresetRepository'
export { createGameSessionRepository } from './gameSessionRepository'

export function createPersistenceServices(db: CivBrowserDatabase): PersistenceServices {
  return {
    maps: createMapRepository(db),
    civilizations: createCivilizationRepository(db),
    rulesPresets: createRulesPresetRepository(db),
    gameSessions: createGameSessionRepository(db),
  }
}
