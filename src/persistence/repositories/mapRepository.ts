import { validateMapTemplate } from '../../domain/validators'
import type { CivBrowserDatabase } from '../database'
import { deleteById, getCloned, listCloned, saveValidated } from './helpers'
import type { MapRepository } from './types'

export function createMapRepository(db: CivBrowserDatabase): MapRepository {
  return {
    list: () => listCloned('maps.list', () => db.maps.toArray()),
    get: (id) => getCloned('maps.get', () => db.maps.get(id)),
    save: (map) =>
      saveValidated('maps.save', map, validateMapTemplate, (value) => db.maps.put(value)),
    delete: (id) => deleteById('maps.delete', () => db.maps.delete(id)),
  }
}
