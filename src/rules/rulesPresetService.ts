import type { GameRulesPreset, GameRulesValues } from '../domain/rules'
import { validateGameRulesPreset } from '../domain/validators'
import {
  catalogErrorMessage,
  getCatalogPersistence,
  type CatalogPersistenceOptions,
} from '../catalog/persistence'
import { STANDARD_RULES_PRESET_ID } from '../persistence/seed'
import {
  createPresetFromSource,
  duplicatePreset,
  isStandardPresetId,
  isoNow,
  sortPresets,
  validatePresetName,
} from './rulesPresetFactory'
import { cloneRulesValues } from './parameterDefinitions'

export { catalogErrorMessage as rulesPresetErrorMessage }

export async function ensureRulesPresetsReady(
  options?: CatalogPersistenceOptions,
): Promise<GameRulesPreset[]> {
  const services = await getCatalogPersistence(options)
  // seedDefaults runs inside createPersistence when seed:true
  const list = await services.rulesPresets.list()
  return sortPresets(list)
}

export async function listRulesPresets(
  options?: CatalogPersistenceOptions,
): Promise<GameRulesPreset[]> {
  const services = await getCatalogPersistence(options)
  return sortPresets(await services.rulesPresets.list())
}

export async function getRulesPreset(
  id: string,
  options?: CatalogPersistenceOptions,
): Promise<GameRulesPreset | null> {
  const services = await getCatalogPersistence(options)
  return services.rulesPresets.get(id)
}

export async function saveRulesPreset(
  preset: GameRulesPreset,
  options?: CatalogPersistenceOptions,
): Promise<GameRulesPreset> {
  const nameError = validatePresetName(preset.name)
  if (nameError) throw new Error(nameError)

  const toSave: GameRulesPreset = {
    ...preset,
    name: preset.name.trim(),
    settings: cloneRulesValues(preset.settings),
    updatedAt: isoNow(),
  }
  const validated = validateGameRulesPreset(toSave)
  if (!validated.ok) throw new Error(validated.errors.join('; '))

  const services = await getCatalogPersistence(options)
  await services.rulesPresets.save(validated.value)
  const stored = await services.rulesPresets.get(validated.value.id)
  if (!stored) throw new Error('Preset was saved but could not be reloaded')
  return stored
}

export async function createRulesPreset(
  input: { name: string; settings: GameRulesValues },
  options?: CatalogPersistenceOptions,
): Promise<GameRulesPreset> {
  const created = createPresetFromSource(input)
  if (!created.ok) throw new Error(created.error)
  return saveRulesPreset(created.value, options)
}

export async function duplicateRulesPreset(
  sourceId: string,
  options?: CatalogPersistenceOptions,
): Promise<GameRulesPreset> {
  const services = await getCatalogPersistence(options)
  const source = await services.rulesPresets.get(sourceId)
  if (!source) throw new Error('Preset not found')
  const copy = duplicatePreset(source)
  await services.rulesPresets.save(copy)
  const stored = await services.rulesPresets.get(copy.id)
  if (!stored) throw new Error('Duplicate was saved but could not be reloaded')
  return stored
}

export async function deleteRulesPreset(
  id: string,
  options?: CatalogPersistenceOptions,
): Promise<void> {
  if (isStandardPresetId(id)) {
    throw new Error('The Standard preset cannot be deleted')
  }
  const services = await getCatalogPersistence(options)
  const existing = await services.rulesPresets.get(id)
  if (!existing) return
  await services.rulesPresets.delete(id)
}

export { STANDARD_RULES_PRESET_ID, isStandardPresetId }
