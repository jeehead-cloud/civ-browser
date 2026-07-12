import { validateGameRulesPreset } from '../../domain/validators'
import type { CivBrowserDatabase } from '../database'
import { deleteById, getCloned, listCloned, saveValidated } from './helpers'
import type { RulesPresetRepository } from './types'

export function createRulesPresetRepository(db: CivBrowserDatabase): RulesPresetRepository {
  return {
    list: () => listCloned('rulesPresets.list', () => db.rulesPresets.toArray()),
    get: (id) => getCloned('rulesPresets.get', () => db.rulesPresets.get(id)),
    save: (preset) =>
      saveValidated(
        'rulesPresets.save',
        preset,
        validateGameRulesPreset,
        (value) => db.rulesPresets.put(value),
      ),
    delete: (id) => deleteById('rulesPresets.delete', () => db.rulesPresets.delete(id)),
  }
}
