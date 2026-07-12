import type { CivilizationTemplate } from '../../domain/civilizations'
import type { GameSession } from '../../domain/gameSession'
import type { MapTemplate } from '../../domain/maps'
import type { GameRulesPreset } from '../../domain/rules'

export interface MapRepository {
  list(): Promise<MapTemplate[]>
  get(id: string): Promise<MapTemplate | null>
  save(map: MapTemplate): Promise<void>
  delete(id: string): Promise<void>
}

export interface CivilizationRepository {
  list(): Promise<CivilizationTemplate[]>
  get(id: string): Promise<CivilizationTemplate | null>
  save(civilization: CivilizationTemplate): Promise<void>
  delete(id: string): Promise<void>
}

export interface RulesPresetRepository {
  list(): Promise<GameRulesPreset[]>
  get(id: string): Promise<GameRulesPreset | null>
  save(preset: GameRulesPreset): Promise<void>
  delete(id: string): Promise<void>
}

export interface GameSessionRepository {
  list(): Promise<GameSession[]>
  get(id: string): Promise<GameSession | null>
  save(session: GameSession): Promise<void>
  delete(id: string): Promise<void>
}

export interface PersistenceServices {
  maps: MapRepository
  civilizations: CivilizationRepository
  rulesPresets: RulesPresetRepository
  gameSessions: GameSessionRepository
}
