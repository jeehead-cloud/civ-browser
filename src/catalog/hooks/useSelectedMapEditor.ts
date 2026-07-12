import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { useGameStore } from '../../game/store'
import { loadMapTemplateIntoEditor } from '../editorBridge'
import {
  editorPersistenceErrorMessage,
  legacyEditorToMapTemplate,
  legacyEditorToMapTemplateSaveAs,
  loadCatalogMapById,
  saveMapTemplateToCatalog,
} from '../editorPersistence'
import { clearCatalogBridgeMeta } from '../editorBridgeCore'

export type EditorPageStatus = 'loading' | 'ready' | 'not_found' | 'error'

/**
 * F5 selected-map editor controller — loads/saves via repository, tracks dirty, blocks leave.
 */
export function useSelectedMapEditor(mapId: string | undefined) {
  const navigate = useNavigate()
  const isScratch = !mapId || mapId === 'current'

  const [status, setStatus] = useState<EditorPageStatus>(isScratch ? 'ready' : 'loading')
  const [error, setError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const editorDirty = useGameStore((s) => s.editorDirty)
  const activeCatalogMapId = useGameStore((s) => s.activeCatalogMapId)
  const activeCatalogMapName = useGameStore((s) => s.activeCatalogMapName)
  const activeCatalogMapDescription = useGameStore((s) => s.activeCatalogMapDescription)
  const lastSavedAt = useGameStore((s) => s.lastSavedAt)
  const clearCatalogEditorBinding = useGameStore((s) => s.clearCatalogEditorBinding)
  const setCatalogMapMeta = useGameStore((s) => s.setCatalogMapMeta)

  const reload = useCallback(async () => {
    if (isScratch || !mapId) {
      setStatus('ready')
      setError(null)
      return
    }
    setStatus('loading')
    setError(null)
    setSaveNotice(null)
    setSaveError(null)
    try {
      const map = await loadCatalogMapById(mapId)
      if (!map) {
        clearCatalogEditorBinding()
        clearCatalogBridgeMeta()
        setStatus('not_found')
        return
      }
      loadMapTemplateIntoEditor(map)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(editorPersistenceErrorMessage(err, 'Failed to load map'))
    }
  }, [isScratch, mapId, clearCatalogEditorBinding])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!editorDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [editorDirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isScratch &&
      editorDirty &&
      currentLocation.pathname !== nextLocation.pathname,
  )

  const save = useCallback(async () => {
    const s = useGameStore.getState()
    if (!s.activeCatalogMapId || !s.activeCatalogMapCreatedAt) {
      throw new Error('No catalog map is bound to this editor')
    }
    setSaving(true)
    setSaveError(null)
    setSaveNotice(null)
    try {
      const converted = legacyEditorToMapTemplate(
        {
          tiles: s.game.tiles,
          cities: s.game.cities,
          width: s.activeMapWidth,
          height: s.activeMapHeight,
        },
        {
          id: s.activeCatalogMapId,
          name: s.activeCatalogMapName,
          description: s.activeCatalogMapDescription,
          version: s.activeCatalogMapVersion,
          createdAt: s.activeCatalogMapCreatedAt,
        },
      )
      if (!converted.ok) throw new Error(converted.errors.join('; '))
      const stored = await saveMapTemplateToCatalog(converted.value)
      // Keep live editor tiles/cities (civs/runtime intact); only refresh catalog meta + dirty.
      useGameStore.setState({
        activeCatalogMapId: stored.id,
        activeCatalogMapName: stored.name,
        activeCatalogMapDescription: stored.description,
        activeCatalogMapVersion: stored.version,
        activeCatalogMapCreatedAt: stored.createdAt,
        activeMapWidth: stored.width,
        activeMapHeight: stored.height,
        editorDirty: false,
        lastSavedAt: stored.updatedAt,
        catalogBridge: { mapId: stored.id, mapName: stored.name },
      })
      setSaveNotice(`Saved “${stored.name}”.`)
      return stored
    } catch (err) {
      const message = editorPersistenceErrorMessage(err, 'Failed to save map')
      setSaveError(message)
      // Dirty state intentionally left true.
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }, [])

  const saveAs = useCallback(
    async (name: string, description?: string) => {
      setSaving(true)
      setSaveError(null)
      setSaveNotice(null)
      try {
        const s = useGameStore.getState()
        const converted = legacyEditorToMapTemplateSaveAs(
          {
            tiles: s.game.tiles,
            cities: s.game.cities,
            width: s.activeMapWidth,
            height: s.activeMapHeight,
          },
          {
            name,
            description: description ?? s.activeCatalogMapDescription,
          },
        )
        if (!converted.ok) throw new Error(converted.errors.join('; '))
        const stored = await saveMapTemplateToCatalog(converted.value)
        loadMapTemplateIntoEditor(stored)
        setSaveNotice(`Saved as “${stored.name}”.`)
        navigate(`/library/maps/${stored.id}/edit`, { replace: true })
        return stored
      } catch (err) {
        const message = editorPersistenceErrorMessage(err, 'Failed to save as new map')
        setSaveError(message)
        throw new Error(message)
      } finally {
        setSaving(false)
      }
    },
    [navigate],
  )

  return {
    isScratch,
    status,
    error,
    saveNotice,
    saveError,
    saving,
    editorDirty,
    activeCatalogMapId,
    activeCatalogMapName,
    activeCatalogMapDescription,
    lastSavedAt,
    reload,
    save,
    saveAs,
    setCatalogMapMeta,
    setSaveNotice,
    setSaveError,
    blocker,
  }
}
