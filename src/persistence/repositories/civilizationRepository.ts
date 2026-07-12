import { validateCivilizationTemplate } from '../../domain/validators'
import type { CivBrowserDatabase } from '../database'
import { deleteById, getCloned, listCloned, saveValidated } from './helpers'
import type { CivilizationRepository } from './types'

export function createCivilizationRepository(db: CivBrowserDatabase): CivilizationRepository {
  return {
    list: () => listCloned('civilizations.list', () => db.civilizations.toArray()),
    get: (id) => getCloned('civilizations.get', () => db.civilizations.get(id)),
    save: (civilization) =>
      saveValidated(
        'civilizations.save',
        civilization,
        validateCivilizationTemplate,
        (value) => db.civilizations.put(value),
      ),
    delete: (id) => deleteById('civilizations.delete', () => db.civilizations.delete(id)),
  }
}
