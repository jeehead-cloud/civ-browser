import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MapTemplate } from '../../domain/maps'
import { validateMapTemplate } from '../../domain/validators'
import { catalogErrorMessage, getCatalogPersistence } from '../persistence'
import {
  createBlankMapTemplate,
  duplicateMapTemplate,
  filterMapsByQuery,
  validateMapDimensions,
} from '../mapFactory'
import {
  downloadTextFile,
  mapTemplateToLegacyV1JsonString,
  parseLegacyV1MapJson,
  safeDownloadBasename,
} from '../mapJson'
import { loadMapTemplateIntoEditor } from '../editorBridge'

export type CatalogStatus = 'loading' | 'ready' | 'error'

export function useMapsCatalog() {
  const [maps, setMaps] = useState<MapTemplate[]>([])
  const [status, setStatus] = useState<CatalogStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const services = await getCatalogPersistence()
      const list = await services.maps.list()
      setMaps(list)
      setStatus('ready')
      setError(null)
    } catch (err) {
      setStatus('error')
      setError(catalogErrorMessage(err, 'Failed to load maps catalog'))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStatus('loading')
      try {
        const services = await getCatalogPersistence()
        if (cancelled) return
        const list = await services.maps.list()
        if (cancelled) return
        setMaps(list)
        setStatus('ready')
        setError(null)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(catalogErrorMessage(err, 'Failed to open maps catalog'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => filterMapsByQuery(maps, query), [maps, query])

  const createMap = useCallback(
    async (input: { name: string; description: string; width: number; height: number }) => {
      const dimErrors = validateMapDimensions(input.width, input.height)
      if (!input.name.trim()) dimErrors.unshift('Name is required')
      if (dimErrors.length) throw new Error(dimErrors.join('; '))

      setBusy(true)
      setNotice(null)
      try {
        const draft = createBlankMapTemplate(input)
        const validated = validateMapTemplate(draft)
        if (!validated.ok) throw new Error(validated.errors.join('; '))
        const services = await getCatalogPersistence()
        await services.maps.save(validated.value)
        await refresh()
        setNotice(`Created map “${validated.value.name}”.`)
        return validated.value
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to create map'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const duplicateMap = useCallback(
    async (id: string) => {
      setBusy(true)
      setNotice(null)
      try {
        const services = await getCatalogPersistence()
        const source = await services.maps.get(id)
        if (!source) throw new Error('Map not found')
        const copy = duplicateMapTemplate(source)
        await services.maps.save(copy)
        await refresh()
        setNotice(`Duplicated as “${copy.name}”.`)
        return copy
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to duplicate map'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const deleteMap = useCallback(
    async (id: string) => {
      setBusy(true)
      setNotice(null)
      try {
        const services = await getCatalogPersistence()
        await services.maps.delete(id)
        await refresh()
        setNotice('Map deleted.')
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to delete map'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const importJson = useCallback(
    async (text: string, name?: string) => {
      setBusy(true)
      setNotice(null)
      try {
        const parsed = parseLegacyV1MapJson(text, { name })
        if (!parsed.ok) throw new Error(parsed.errors.join('; '))
        const services = await getCatalogPersistence()
        await services.maps.save(parsed.value.map)
        await refresh()
        const ignored = parsed.value.ignoredSections
        const note =
          ignored.length > 0
            ? `Imported “${parsed.value.map.name}”. Ignored JSON sections: ${ignored.join(', ')}.`
            : `Imported “${parsed.value.map.name}”.`
        setNotice(note)
        return parsed.value.map
      } catch (err) {
        throw new Error(catalogErrorMessage(err, 'Failed to import map'))
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const exportMap = useCallback(async (id: string) => {
    const services = await getCatalogPersistence()
    const map = await services.maps.get(id)
    if (!map) throw new Error('Map not found')
    const json = mapTemplateToLegacyV1JsonString(map)
    downloadTextFile(`${safeDownloadBasename(map.name)}.json`, json)
    setNotice(`Exported “${map.name}” as version-1 JSON.`)
  }, [])

  const openInEditor = useCallback(async (id: string) => {
    const services = await getCatalogPersistence()
    const map = await services.maps.get(id)
    if (!map) throw new Error('Map not found')
    loadMapTemplateIntoEditor(map)
    return map
  }, [])

  return {
    maps,
    filtered,
    status,
    error,
    query,
    setQuery,
    busy,
    notice,
    setNotice,
    refresh,
    createMap,
    duplicateMap,
    deleteMap,
    importJson,
    exportMap,
    openInEditor,
  }
}
