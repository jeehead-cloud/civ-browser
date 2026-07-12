import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import type { CivilizationTemplate } from '../../domain/civilizations'
import type { MapTemplate } from '../../domain/maps'
import type { GameRulesPreset } from '../../domain/rules'
import { STANDARD_RULES_PRESET_ID } from '../../persistence/seed'
import {
  DEFAULT_MAXIMUM_TURNS,
  DEFAULT_STARTING_YEAR,
  DEFAULT_YEARS_PER_TURN,
  type NewGameStepId,
} from '../constants'
import {
  createAndSaveGameSession,
  loadCivilizationsForWizard,
  loadMapsForWizard,
  loadRulesPresetsForWizard,
} from '../newGameService'
import {
  defaultGameName,
  isWizardDirty,
  validateWizardStep,
} from '../setupValidation'
import {
  addCivilization,
  createInitialWizardState,
  goToStep,
  humanSelection,
  markCreationSucceeded,
  removeCivilization,
  selectMap,
  setCivilizationCapital,
  setCivilizationColor,
  setCivilizationPlayerType,
  setGameName,
  setMaximumTurns,
  setRulesPresetId,
  setStartingYear,
  setYearsPerTurn,
} from '../wizardState'
import type { NewGameWizardState, PlayerType } from '../types'

export type WizardLoadStatus = 'loading' | 'ready' | 'error'

export function useNewGameWizard() {
  const navigate = useNavigate()
  const [state, setState] = useState<NewGameWizardState>(() => createInitialWizardState(STANDARD_RULES_PRESET_ID))
  const [maps, setMaps] = useState<MapTemplate[]>([])
  const [civilizations, setCivilizations] = useState<CivilizationTemplate[]>([])
  const [presets, setPresets] = useState<GameRulesPreset[]>([])
  const [status, setStatus] = useState<WizardLoadStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapQuery, setMapQuery] = useState('')
  const [civQuery, setCivQuery] = useState('')
  const [stepErrors, setStepErrors] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [pendingExternalPath, setPendingExternalPath] = useState<string | null>(null)
  const maxReachedRef = useRef<NewGameStepId>(1)
  const submittingRef = useRef(false)

  const refreshSources = useCallback(async () => {
    setStatus('loading')
    setLoadError(null)
    try {
      const [mapList, civList, presetList] = await Promise.all([
        loadMapsForWizard(),
        loadCivilizationsForWizard(),
        loadRulesPresetsForWizard(),
      ])
      setMaps(mapList)
      setCivilizations(civList)
      setPresets(presetList)
      setState((prev) => {
        if (prev.rulesPresetId && presetList.some((p) => p.id === prev.rulesPresetId)) return prev
        const standard = presetList.find((p) => p.id === STANDARD_RULES_PRESET_ID)
        return setRulesPresetId(prev, standard?.id ?? presetList[0]?.id ?? '')
      })
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setLoadError(err instanceof Error ? err.message : 'Failed to load wizard sources')
    }
  }, [])

  useEffect(() => {
    void refreshSources()
  }, [refreshSources])

  const selectedMap = useMemo(
    () => maps.find((m) => m.id === state.mapId) ?? null,
    [maps, state.mapId],
  )

  const templatesById = useMemo(() => {
    const map = new Map<string, CivilizationTemplate>()
    for (const c of civilizations) map.set(c.id, c)
    return map
  }, [civilizations])

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === state.rulesPresetId) ?? null,
    [presets, state.rulesPresetId],
  )

  const humanCiv = humanSelection(state)
  const humanTemplate = humanCiv ? templatesById.get(humanCiv.templateId) : undefined

  const dirty = isWizardDirty(state, {
    startingYear: DEFAULT_STARTING_YEAR,
    yearsPerTurn: DEFAULT_YEARS_PER_TURN,
    maximumTurns: DEFAULT_MAXIMUM_TURNS,
    rulesPresetId: STANDARD_RULES_PRESET_ID,
  })

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return
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

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setLeaveConfirmOpen(true)
    }
  }, [blocker.state])

  const sources = useMemo(
    () => ({
      map: selectedMap,
      templatesById,
      preset: selectedPreset,
    }),
    [selectedMap, templatesById, selectedPreset],
  )

  const currentStepErrors = useMemo(
    () => validateWizardStep(state.step, state, sources),
    [state, sources],
  )

  const maxReachable: NewGameStepId = Math.max(maxReachedRef.current, state.step) as NewGameStepId

  function syncAutoName(next: NewGameWizardState) {
    const human = humanSelection(next)
    const hName = human ? templatesById.get(human.templateId)?.name : undefined
    const mName = maps.find((m) => m.id === next.mapId)?.name
    if (!next.gameNameTouched) {
      return { ...next, gameName: defaultGameName(hName, mName) }
    }
    return next
  }

  const actions = {
    refreshSources,
    setMapQuery,
    setCivQuery,
    selectMapId(mapId: string) {
      const map = maps.find((m) => m.id === mapId)
      if (!map) return
      setState((prev) =>
        syncAutoName(selectMap(prev, mapId, map.name, humanTemplate?.name)),
      )
      setStepErrors([])
      setSaveError(null)
    },
    addCiv(templateId: string) {
      const template = templatesById.get(templateId)
      if (!template) return
      setState((prev) => {
        const playerType: PlayerType =
          prev.civilizations.some((c) => c.playerType === 'human') ? 'ai' : 'human'
        return syncAutoName(
          addCivilization(
            prev,
            {
              templateId,
              playerType,
              color: template.defaultColor,
            },
            {
              humanName:
                playerType === 'human'
                  ? template.name
                  : templatesById.get(humanSelection(prev)?.templateId ?? '')?.name,
              mapName: maps.find((m) => m.id === prev.mapId)?.name,
            },
          ),
        )
      })
      setStepErrors([])
    },
    removeCiv(templateId: string) {
      setState((prev) => syncAutoName(removeCivilization(prev, templateId, {})))
      setStepErrors([])
    },
    setPlayerType(templateId: string, playerType: PlayerType) {
      setState((prev) =>
        syncAutoName(setCivilizationPlayerType(prev, templateId, playerType, {})),
      )
    },
    setColor(templateId: string, color: string) {
      setState((prev) => setCivilizationColor(prev, templateId, color))
    },
    setCapital(templateId: string, capitalCityId: string | null) {
      setState((prev) => setCivilizationCapital(prev, templateId, capitalCityId))
      setStepErrors([])
    },
    setPreset(id: string) {
      setState((prev) => setRulesPresetId(prev, id))
      setStepErrors([])
    },
    setStartingYear(value: number) {
      setState((prev) => setStartingYear(prev, value))
    },
    setYearsPerTurn(value: number) {
      setState((prev) => setYearsPerTurn(prev, value))
    },
    setMaximumTurns(value: number | null) {
      setState((prev) => setMaximumTurns(prev, value))
    },
    setGameName(value: string) {
      setState((prev) => setGameName(prev, value))
    },
    goBack() {
      if (state.step <= 1) return
      setStepErrors([])
      setState((prev) => goToStep(prev, (prev.step - 1) as NewGameStepId))
    },
    goNext() {
      const errors = validateWizardStep(state.step, state, sources)
      if (errors.length) {
        setStepErrors(errors)
        return
      }
      setStepErrors([])
      setState((prev) => {
        const nextStep = Math.min(4, prev.step + 1) as NewGameStepId
        maxReachedRef.current = Math.max(maxReachedRef.current, nextStep) as NewGameStepId
        return goToStep(prev, nextStep)
      })
    },
    jumpToStep(step: NewGameStepId) {
      if (step > maxReachable) return
      setStepErrors([])
      setState((prev) => goToStep(prev, step))
    },
    requestLeave(path: string) {
      if (!dirty) {
        navigate(path)
        return
      }
      setPendingExternalPath(path)
      setLeaveConfirmOpen(true)
    },
    confirmLeave() {
      setLeaveConfirmOpen(false)
      if (blocker.state === 'blocked') {
        blocker.proceed?.()
      }
      if (pendingExternalPath) {
        const path = pendingExternalPath
        setPendingExternalPath(null)
        navigate(path)
      }
    },
    cancelLeave() {
      setLeaveConfirmOpen(false)
      setPendingExternalPath(null)
      if (blocker.state === 'blocked') {
        blocker.reset?.()
      }
    },
    async createGame() {
      if (submittingRef.current || saving) return
      const errors = validateWizardStep(4, state, sources)
      if (errors.length) {
        setStepErrors(errors)
        return
      }
      if (!state.mapId || !state.rulesPresetId) {
        setStepErrors(['Map and rules preset are required'])
        return
      }
      submittingRef.current = true
      setSaving(true)
      setSaveError(null)
      try {
        const result = await createAndSaveGameSession({
          name: state.gameName,
          mapId: state.mapId,
          civilizations: state.civilizations,
          rulesPresetId: state.rulesPresetId,
          startingYear: state.startingYear,
          yearsPerTurn: state.yearsPerTurn,
          maximumTurns: state.maximumTurns,
        })
        if (!result.ok) {
          setSaveError(result.errors.join('; '))
          setStepErrors(result.errors)
          return
        }
        setState((prev) => markCreationSucceeded(prev))
        navigate(`/games/${result.session.id}`)
      } finally {
        submittingRef.current = false
        setSaving(false)
      }
    },
  }

  const filteredMaps = useMemo(() => {
    const q = mapQuery.trim().toLowerCase()
    if (!q) return maps
    return maps.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    )
  }, [maps, mapQuery])

  const filteredCivs = useMemo(() => {
    const q = civQuery.trim().toLowerCase()
    const available = civilizations.filter(
      (c) => !state.civilizations.some((s) => s.templateId === c.id),
    )
    if (!q) return available
    return available.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.cultureName.toLowerCase().includes(q) ||
        (c.leader ?? '').toLowerCase().includes(q),
    )
  }, [civilizations, civQuery, state.civilizations])

  const usedCapitalIds = useMemo(() => {
    return new Set(
      state.civilizations.map((c) => c.capitalCityId).filter((id): id is string => Boolean(id)),
    )
  }, [state.civilizations])

  return {
    state,
    maps,
    civilizations,
    presets,
    selectedMap,
    selectedPreset,
    templatesById,
    humanTemplate,
    status,
    loadError,
    mapQuery,
    civQuery,
    filteredMaps,
    filteredCivs,
    usedCapitalIds,
    stepErrors: stepErrors.length ? stepErrors : [],
    currentStepErrors,
    saveError,
    saving,
    dirty,
    leaveConfirmOpen,
    maxReachable,
    actions,
  }
}
