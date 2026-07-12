import type { City, Civilization, GameSettings, Tile } from '../game/types'
import {
  civilizationTemplateToInstance,
  civilizationToTemplate,
  deepClone,
  legacyMapToMapTemplate,
  legacyToGameSession,
  mapCityTemplateToGameCity,
  rulesPresetToSnapshot,
  settingsToRulesPreset,
} from './adapters'

export interface DomainVerificationReport {
  ok: boolean
  checks: { name: string; pass: boolean; detail?: string }[]
}

function makeTile(q: number, r: number, terrain: Tile['terrain'] = 'grassland'): Tile {
  return {
    coord: { q, r },
    terrain,
    vegetation: 'none',
    resource: 'none',
    ownerCivId: null,
    cityId: null,
    hasHills: false,
    riverDirections: [],
  }
}

/** Deterministic deep-copy / invariant / serialization checks for F2 adapters. */
export function runDomainVerification(): DomainVerificationReport {
  const checks: DomainVerificationReport['checks'] = []
  const record = (name: string, pass: boolean, detail?: string) => {
    checks.push({ name, pass, detail })
  }

  const tiles: Record<string, Tile> = {
    '0,0': makeTile(0, 0),
    '1,0': makeTile(1, 0, 'plains'),
    '0,1': makeTile(0, 1, 'ocean'),
  }
  tiles['0,0'].cityId = 'city-1'

  const cities: City[] = [
    {
      id: 'city-1',
      civId: 'civ-1',
      name: 'Capital',
      coord: { q: 0, r: 0 },
      population: 5,
      productionQueue: [],
      culture: 10,
      isCapital: true,
      growthRateBonus: 0.01,
    },
    {
      id: 'city-2',
      civId: null,
      name: 'Free Town',
      coord: { q: 1, r: 0 },
      population: 2,
      productionQueue: [],
      culture: 0,
      isCapital: false,
      growthRateBonus: 0,
    },
  ]

  const civs: Civilization[] = [
    {
      id: 'civ-1',
      name: 'Rome',
      color: '#aa0000',
      playerType: 'human',
      cultureName: 'Romans',
      flagEmoji: '🦅',
      capitalCityId: 'city-1',
    },
  ]

  const settings: GameSettings = {
    baseGrowthRate: 0.01,
    capitalCulturePerTurn: 1,
    cultureAnnexThreshold: 50,
  }

  const mapResult = legacyMapToMapTemplate({
    id: 'map-1',
    name: 'Test Map',
    description: 'verify',
    width: 2,
    height: 2,
    tiles,
    cities,
  })
  record('legacyMapToMapTemplate succeeds', mapResult.ok, mapResult.ok ? undefined : mapResult.errors.join('; '))

  const presetResult = settingsToRulesPreset(settings, { id: 'rules-1', name: 'Default' })
  record('settingsToRulesPreset succeeds', presetResult.ok, presetResult.ok ? undefined : presetResult.errors.join('; '))

  if (mapResult.ok && presetResult.ok) {
    const template = mapResult.value
    const preset = presetResult.value

    // 1. Mutating session tiles must not mutate MapTemplate tiles
    const sessionResult = legacyToGameSession({
      id: 'session-1',
      name: 'Test Session',
      width: 2,
      height: 2,
      game: {
        tiles,
        cities,
        units: [],
        civilizations: civs,
        turn: 1,
        settings,
      },
      currentYear: -4000,
      yearsPerTurn: 10,
      requireCompleteCapitals: true,
      sourceMap: {
        templateId: template.id,
        templateVersion: template.version,
        templateName: template.name,
      },
    })
    record(
      'legacyToGameSession succeeds',
      sessionResult.ok,
      sessionResult.ok ? undefined : sessionResult.errors.join('; '),
    )

    if (sessionResult.ok) {
      const session = sessionResult.value
      const templateTerrainBefore = template.tiles['0,0'].terrain
      session.tiles['0,0'].terrain = 'desert'
      record(
        'mutating session tiles does not mutate MapTemplate tiles',
        template.tiles['0,0'].terrain === templateTerrainBefore && template.tiles['0,0'].terrain !== 'desert',
      )

      // 2. Mutating GameCity does not mutate MapCityTemplate
      const mapCity = template.cities.find((c) => c.id === 'city-1')!
      const gameCity = mapCityTemplateToGameCity(mapCity)
      gameCity.population = 999
      gameCity.name = 'Mutated'
      record(
        'mutating GameCity does not mutate MapCityTemplate',
        mapCity.startingPopulation === 5 && mapCity.name === 'Capital',
      )

      // 3. Mutating CivilizationInstance does not mutate CivilizationTemplate
      const civTemplate = civilizationToTemplate(civs[0])
      const instance = civilizationTemplateToInstance(civTemplate, {
        playerType: 'ai',
        capitalCityId: 'city-1',
      })
      instance.name = 'Changed'
      instance.color = '#000000'
      record(
        'mutating CivilizationInstance does not mutate CivilizationTemplate',
        civTemplate.name === 'Rome' && civTemplate.defaultColor === '#aa0000',
      )

      // 4. Mutating session rules does not mutate GameRulesPreset
      const snapshot = rulesPresetToSnapshot(preset)
      session.rules = deepClone(snapshot)
      session.rules.settings.baseGrowthRate = 0.99
      record(
        'mutating session rules does not mutate GameRulesPreset',
        preset.settings.baseGrowthRate === 0.01,
      )

      // 5. JSON serialization of domain entities
      try {
        const payload = {
          mapTemplate: template,
          rulesPreset: preset,
          gameSession: session,
          civilizationTemplate: civTemplate,
        }
        const json = JSON.stringify(payload)
        const parsed = JSON.parse(json)
        record(
          'JSON serialization of domain entities succeeds',
          parsed.mapTemplate.id === 'map-1' &&
            parsed.rulesPreset.settings.baseGrowthRate === 0.01 &&
            parsed.gameSession.cities.length === 2,
        )
      } catch (e) {
        record('JSON serialization of domain entities succeeds', false, String(e))
      }
    }
  }

  // Invariant: bad dimensions fail
  const badMap = legacyMapToMapTemplate({
    id: 'bad',
    name: 'Bad',
    width: 0,
    height: 2,
    tiles,
    cities: [],
  })
  record('rejects non-positive map dimensions', !badMap.ok)

  // Invariant: city off-map fails
  const offMap = legacyMapToMapTemplate({
    id: 'off',
    name: 'Off',
    width: 2,
    height: 2,
    tiles,
    cities: [
      {
        id: 'ghost',
        civId: null,
        name: 'Ghost',
        coord: { q: 99, r: 99 },
        population: 1,
        productionQueue: [],
        culture: 0,
        isCapital: false,
        growthRateBonus: 0,
      },
    ],
  })
  record('rejects city coordinates not on map', !offMap.ok)

  const ok = checks.every((c) => c.pass)
  return { ok, checks }
}
