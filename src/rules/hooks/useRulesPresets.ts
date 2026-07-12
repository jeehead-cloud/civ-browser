import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import type { GameRulesPreset, GameRulesValues } from '../../domain/rules'
import {
  cloneRulesValues,
  resetAllToDefaults,
  resetCategory,
  resetField,
  settingsEqual,
  type RulesCategoryId,
  validateSettingsAgainstDefinitions,
} from '../parameterDefinitions'
import {
  createRulesPreset,
  deleteRulesPreset,
  duplicateRulesPreset,
  ensureRulesPresetsReady,
  isStandardPresetId,
  listRulesPresets,
  rulesPresetErrorMessage,
  saveRulesPreset,
  STANDARD_RULES_PRESET_ID,
} from '../rulesPresetService'

export type RulesPresetsStatus = 'loading' | 'ready' | 'error'

export function useRulesPresets() {
  const [presets, setPresets] = useState<GameRulesPreset[]>([])
  const [status, setStatus] = useState<RulesPresetsStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftSettings, setDraftSettings] = useState<GameRulesValues | null>(null)
  const [persisted, setPersisted] = useState<GameRulesPreset | null>(null)
  const [categoryId, setCategoryId] = useState<RulesCategoryId>('cityDevelopment')
  const [search, setSearch] = useState('')
  const [changedOnly, setChangedOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null)

  const dirty = useMemo(() => {
    if (!persisted || !draftSettings) return false
    return draftName.trim() !== persisted.name || !settingsEqual(draftSettings, persisted.settings)
  }, [draftName, draftSettings, persisted])

  const fieldErrors = useMemo(() => {
    if (!draftSettings) return {}
    return validateSettingsAgainstDefinitions(draftSettings)
  }, [draftSettings])

  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const loadDraft = useCallback((preset: GameRulesPreset) => {
    setSelectedId(preset.id)
    setPersisted(preset)
    setDraftName(preset.name)
    setDraftSettings(cloneRulesValues(preset.settings))
    setSaveError(null)
  }, [])

  const refresh = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const list = await ensureRulesPresetsReady()
      setPresets(list)
      if (list.length === 0) {
        setStatus('error')
        setError('No rules presets found after seeding. Retry or check storage.')
        return
      }
      setStatus('ready')
      const keep =
        (selectedId && list.find((p) => p.id === selectedId)) ||
        list.find((p) => p.id === STANDARD_RULES_PRESET_ID) ||
        list[0]
      loadDraft(keep)
    } catch (err) {
      setStatus('error')
      setError(rulesPresetErrorMessage(err, 'Failed to load rules presets'))
    }
  }, [loadDraft, selectedId])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  const selectPreset = useCallback(
    (id: string) => {
      if (id === selectedId) return
      if (dirty) {
        setPendingSwitchId(id)
        return
      }
      const preset = presets.find((p) => p.id === id)
      if (preset) loadDraft(preset)
    },
    [dirty, loadDraft, presets, selectedId],
  )

  const confirmSwitchPreset = useCallback(() => {
    if (!pendingSwitchId) return
    const preset = presets.find((p) => p.id === pendingSwitchId)
    setPendingSwitchId(null)
    if (preset) loadDraft(preset)
  }, [loadDraft, pendingSwitchId, presets])

  const cancelSwitchPreset = useCallback(() => setPendingSwitchId(null), [])

  const setSetting = useCallback((key: keyof GameRulesValues, value: number) => {
    setDraftSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }, [])

  const revertUnsaved = useCallback(() => {
    if (!persisted) return
    setDraftName(persisted.name)
    setDraftSettings(cloneRulesValues(persisted.settings))
    setSaveError(null)
    setNotice('Reverted unsaved changes')
  }, [persisted])

  const resetFieldToDefault = useCallback((key: keyof GameRulesValues) => {
    setDraftSettings((prev) => (prev ? resetField(prev, key) : prev))
  }, [])

  const resetCategoryToDefaults = useCallback(() => {
    setDraftSettings((prev) => (prev ? resetCategory(prev, categoryId) : prev))
  }, [categoryId])

  const resetPresetToDefaults = useCallback(() => {
    setDraftSettings(resetAllToDefaults())
  }, [])

  const save = useCallback(async () => {
    if (!persisted || !draftSettings) return
    if (hasFieldErrors) {
      setSaveError('Fix invalid fields before saving')
      return
    }
    setBusy(true)
    setSaveError(null)
    setNotice(null)
    try {
      const stored = await saveRulesPreset({
        ...persisted,
        name: draftName,
        settings: draftSettings,
      })
      setPersisted(stored)
      setDraftName(stored.name)
      setDraftSettings(cloneRulesValues(stored.settings))
      setPresets(await listRulesPresets())
      setNotice(`Saved “${stored.name}”.`)
    } catch (err) {
      setSaveError(rulesPresetErrorMessage(err, 'Failed to save preset'))
    } finally {
      setBusy(false)
    }
  }, [draftName, draftSettings, hasFieldErrors, persisted])

  const create = useCallback(
    async (name: string, copyFromId?: string) => {
      if (dirty) throw new Error('Save or revert unsaved changes before creating a preset')
      setBusy(true)
      setSaveError(null)
      try {
        const source =
          presets.find((p) => p.id === (copyFromId ?? selectedId ?? STANDARD_RULES_PRESET_ID)) ??
          presets.find((p) => p.id === STANDARD_RULES_PRESET_ID)
        if (!source) throw new Error('No source preset available')
        const created = await createRulesPreset({
          name,
          settings: source.settings,
        })
        const list = await listRulesPresets()
        setPresets(list)
        loadDraft(created)
        setNotice(`Created “${created.name}”.`)
        return created
      } finally {
        setBusy(false)
      }
    },
    [dirty, loadDraft, presets, selectedId],
  )

  const duplicate = useCallback(async () => {
    if (!selectedId) return
    if (dirty) throw new Error('Save or revert unsaved changes before duplicating')
    setBusy(true)
    setSaveError(null)
    try {
      const copy = await duplicateRulesPreset(selectedId)
      setPresets(await listRulesPresets())
      loadDraft(copy)
      setNotice(`Duplicated as “${copy.name}”.`)
      return copy
    } finally {
      setBusy(false)
    }
  }, [dirty, loadDraft, selectedId])

  const remove = useCallback(async () => {
    if (!selectedId || isStandardPresetId(selectedId)) {
      throw new Error('The Standard preset cannot be deleted')
    }
    setBusy(true)
    setSaveError(null)
    try {
      await deleteRulesPreset(selectedId)
      const list = await listRulesPresets()
      setPresets(list)
      const next =
        list.find((p) => p.id === STANDARD_RULES_PRESET_ID) ?? list[0] ?? null
      if (next) loadDraft(next)
      else {
        setSelectedId(null)
        setPersisted(null)
        setDraftSettings(null)
      }
      setNotice('Preset deleted.')
    } finally {
      setBusy(false)
    }
  }, [loadDraft, selectedId])

  return {
    presets,
    status,
    error,
    selectedId,
    persisted,
    draftName,
    setDraftName,
    draftSettings,
    setSetting,
    categoryId,
    setCategoryId,
    search,
    setSearch,
    changedOnly,
    setChangedOnly,
    dirty,
    fieldErrors,
    hasFieldErrors,
    busy,
    saveError,
    notice,
    setNotice,
    refresh,
    selectPreset,
    pendingSwitchId,
    confirmSwitchPreset,
    cancelSwitchPreset,
    revertUnsaved,
    resetFieldToDefault,
    resetCategoryToDefaults,
    resetPresetToDefaults,
    save,
    create,
    duplicate,
    remove,
    blocker,
    isStandard: selectedId ? isStandardPresetId(selectedId) : false,
  }
}
