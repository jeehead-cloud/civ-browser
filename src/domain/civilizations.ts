/**
 * Reusable civilization catalog entry.
 * No capital, cities, culture progress, or player/AI runtime state.
 */
export interface CivilizationTemplate {
  id: string
  name: string
  cultureName: string
  /** Current product uses emoji flags; real icon assets are a later upgrade. */
  flagEmoji: string
  defaultColor: string
  /** Reserved; not present on legacy Civilization today. */
  leader?: string
  version: number
  createdAt: string
  updatedAt: string
}

/**
 * Civilization participating in one GameSession (name/flag/color are snapshots).
 * Must not hold a live reference to CivilizationTemplate.
 */
export interface CivilizationInstance {
  id: string
  /** Source catalog id when known; may equal `id` when created from legacy MVP data. */
  templateId: string
  name: string
  cultureName: string
  flagEmoji: string
  color: string
  playerType: 'human' | 'ai'
  capitalCityId: string | null
}
