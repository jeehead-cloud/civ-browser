import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CivilizationTemplate } from '../../domain/civilizations'
import { validateCivilizationTemplate } from '../../domain/validators'
import { catalogErrorMessage, getCatalogPersistence } from '../persistence'
import {
  createCivilizationTemplate,
  duplicateCivilizationTemplate,
  filterCivilizationsByQuery,
  validateCivilizationForm,
} from '../civilizationFactory'
import { isoNow } from '../mapFactory'
import type { CatalogStatus } from './useMapsCatalog'

export function useCivilizationsCatalog() {
  const [items, setItems] = useState<CivilizationTemplate[]>([])
  const [status, setStatus] = useState<CatalogStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const services = await getCatalogPersistence()
      const list = await services.civilizations.list()
      setItems(list)
      setStatus('ready')
      setError(null)
    } catch (err) {
      setStatus('error')
      setError(catalogErrorMessage(err, 'Failed to load civilizations catalog'))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStatus('loading')
      try {
        const services = await getCatalogPersistence()
        if (cancelled) return
        const list = await services.civilizations.list()
        if (cancelled) return
        setItems(list)
        setStatus('ready')
        setError(null)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(catalogErrorMessage(err, 'Failed to open civilizations catalog'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => filterCivilizationsByQuery(items, query), [items, query])

  const createCiv = useCallback(
    async (input: {
      name: string
      cultureName: string
      flagEmoji: string
      defaultColor: string
      leader?: string
    }) => {
      const formErrors = validateCivilizationForm(input)
      if (formErrors.length) throw new Error(formErrors.join('; '))
      setBusy(true)
      setNotice(null)
      try {
        const draft = createCivilizationTemplate(input)
        const validated = validateCivilizationTemplate(draft)
        if (!validated.ok) throw new Error(validated.errors.join('; '))
        const services = await getCatalogPersistence()
        await services.civilizations.save(validated.value)
        await refresh()
        setNotice(`Created “${validated.value.name}”.`)
        return validated.value
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to create civilization'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const updateCiv = useCallback(
    async (
      id: string,
      input: {
        name: string
        cultureName: string
        flagEmoji: string
        defaultColor: string
        leader?: string
      },
    ) => {
      const formErrors = validateCivilizationForm(input)
      if (formErrors.length) throw new Error(formErrors.join('; '))
      setBusy(true)
      setNotice(null)
      try {
        const services = await getCatalogPersistence()
        const existing = await services.civilizations.get(id)
        if (!existing) throw new Error('Civilization not found')
        const next: CivilizationTemplate = {
          ...existing,
          name: input.name.trim(),
          cultureName: input.cultureName.trim(),
          flagEmoji: input.flagEmoji.trim(),
          defaultColor: input.defaultColor.trim(),
          leader: input.leader?.trim() || undefined,
          updatedAt: isoNow(),
        }
        const validated = validateCivilizationTemplate(next)
        if (!validated.ok) throw new Error(validated.errors.join('; '))
        await services.civilizations.save(validated.value)
        await refresh()
        setNotice(`Updated “${validated.value.name}”.`)
        return validated.value
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to update civilization'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const duplicateCiv = useCallback(
    async (id: string) => {
      setBusy(true)
      setNotice(null)
      try {
        const services = await getCatalogPersistence()
        const source = await services.civilizations.get(id)
        if (!source) throw new Error('Civilization not found')
        const copy = duplicateCivilizationTemplate(source)
        await services.civilizations.save(copy)
        await refresh()
        setNotice(`Duplicated as “${copy.name}”.`)
        return copy
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to duplicate civilization'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const deleteCiv = useCallback(
    async (id: string) => {
      setBusy(true)
      setNotice(null)
      try {
        const services = await getCatalogPersistence()
        await services.civilizations.delete(id)
        await refresh()
        setNotice('Civilization deleted.')
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to delete civilization'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  return {
    items,
    filtered,
    status,
    error,
    query,
    setQuery,
    busy,
    notice,
    setNotice,
    refresh,
    createCiv,
    updateCiv,
    duplicateCiv,
    deleteCiv,
  }
}
