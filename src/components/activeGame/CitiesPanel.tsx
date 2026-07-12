import { useMemo, useState } from 'react'
import { Input, SegmentedControl } from '../ui'
import type { CivilizationInstance } from '../../domain/civilizations'
import type { GameCity } from '../../domain/gameSession'
import {
  filterCities,
  type CityOwnershipFilter,
} from '../../gameSession/contextSelectors'

interface CitiesPanelProps {
  cities: GameCity[]
  civilizations: CivilizationInstance[]
  onSelectCity: (city: GameCity) => void
}

export function CitiesPanel({ cities, civilizations, onSelectCity }: CitiesPanelProps) {
  const [query, setQuery] = useState('')
  const [ownership, setOwnership] = useState<CityOwnershipFilter>('all')

  const filtered = useMemo(
    () => filterCities(cities, civilizations, query, ownership),
    [cities, civilizations, query, ownership],
  )

  return (
    <section>
      <h3 className="active-game-section-title">Cities</h3>
      <div className="active-cities-toolbar">
        <Input
          aria-label="Search cities"
          placeholder="Search name, owner, coords"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SegmentedControl
          ariaLabel="Filter cities by ownership"
          size="sm"
          value={ownership}
          onChange={(v) => setOwnership(v as CityOwnershipFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'human', label: 'Human' },
            { value: 'ai', label: 'AI' },
            { value: 'unclaimed', label: 'Free' },
          ]}
        />
      </div>
      {filtered.length === 0 ? (
        <p className="active-game-muted">No cities match.</p>
      ) : (
        <ul className="active-game-city-list">
          {filtered.map((city) => {
            const civ = city.civId ? civilizations.find((c) => c.id === city.civId) : null
            return (
              <li key={city.id}>
                <button
                  type="button"
                  className="active-game-civ-btn"
                  onClick={() => onSelectCity(city)}
                >
                  <span className="active-game-civ-btn__body">
                    <strong>
                      {city.name}
                      {city.isCapital ? ' 👑' : ''}
                    </strong>
                    <span className="active-game-muted">
                      {civ ? `${civ.flagEmoji} ${civ.name}` : 'Unclaimed'} · pop {city.population}{' '}
                      · culture {city.culture} · ({city.coord.q},{city.coord.r})
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
