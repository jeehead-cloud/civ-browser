import { useMemo, useState } from 'react'
import { useGameStore } from '../../game/store'
import { tileKey } from '../../game/hexGrid'
import { Button, ConfirmDialog, Dialog, FormField, Input } from '../ui'

interface CitiesSectionProps {
  editEnabled: boolean
}

export function CitiesSection({ editEnabled }: CitiesSectionProps) {
  const cities = useGameStore((s) => s.game.cities)
  const civilizations = useGameStore((s) => s.game.civilizations)
  const builder = useGameStore((s) => s.builder)
  const setMode = useGameStore((s) => s.setMode)
  const setViewMode = useGameStore((s) => s.setViewMode)
  const selectedEditorCityId = useGameStore((s) => s.selectedEditorCityId)
  const setSelectedEditorCityId = useGameStore((s) => s.setSelectedEditorCityId)
  const requestCameraFocus = useGameStore((s) => s.requestCameraFocus)
  const removeCity = useGameStore((s) => s.removeCity)
  const updateCity = useGameStore((s) => s.updateCity)

  const [search, setSearch] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPopulation, setEditPopulation] = useState(1)
  const [editGrowth, setEditGrowth] = useState(0)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((c) => c.name.toLowerCase().includes(q))
  }, [cities, search])

  function openEdit(cityId: string) {
    const city = cities.find((c) => c.id === cityId)
    if (!city) return
    setSelectedEditorCityId(cityId)
    setEditName(city.name)
    setEditPopulation(city.population)
    setEditGrowth(city.growthRateBonus)
    setEditOpen(true)
  }

  function centerOn(cityId: string) {
    const city = cities.find((c) => c.id === cityId)
    if (!city) return
    setSelectedEditorCityId(cityId)
    requestCameraFocus(city.coord)
  }

  const pendingDelete = cities.find((c) => c.id === pendingDeleteId) ?? null

  return (
    <div className="world-editor-cities">
      <Button
        variant={builder.mode === 'city' ? 'primary' : 'secondary'}
        size="sm"
        disabled={!editEnabled}
        onClick={() => {
          setViewMode('edit')
          setMode('city')
        }}
      >
        Create City
      </Button>
      <p className="world-editor-field__hint">
        Select Create City, then click an empty tile. Enter name and starting population in the dialog.
      </p>

      <FormField label="Search cities" htmlFor="city-search">
        <Input
          id="city-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name"
        />
      </FormField>

      <ul className="world-editor-city-list" aria-label="Cities on map">
        {filtered.length === 0 ? (
          <li className="world-editor-city-list__empty">No cities</li>
        ) : (
          filtered.map((city) => {
            const owner = city.civId
              ? civilizations.find((c) => c.id === city.civId)?.name ?? city.civId
              : 'Free'
            const selected = selectedEditorCityId === city.id
            return (
              <li
                key={city.id}
                className={`world-editor-city-list__item${selected ? ' is-selected' : ''}`}
              >
                <button
                  type="button"
                  className="world-editor-city-list__select"
                  onClick={() => {
                    setSelectedEditorCityId(city.id)
                    centerOn(city.id)
                  }}
                >
                  <strong>{city.name}</strong>
                  <span>
                    Pop {city.population}
                    {city.isCapital ? ' · Capital' : ''} · {owner}
                  </span>
                  <span className="world-editor-city-list__coords">
                    ({city.coord.q}, {city.coord.r})
                  </span>
                </button>
                <div className="world-editor-city-list__actions">
                  <Button variant="ghost" size="sm" onClick={() => centerOn(city.id)}>
                    Center
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!editEnabled}
                    onClick={() => openEdit(city.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!editEnabled}
                    onClick={() => setPendingDeleteId(city.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            )
          })
        )}
      </ul>

      <Dialog
        open={editOpen}
        title="Edit city"
        onClose={() => setEditOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="md" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!editName.trim() || editPopulation < 1}
              onClick={() => {
                if (!selectedEditorCityId) return
                updateCity(selectedEditorCityId, {
                  name: editName.trim(),
                  population: Math.max(1, editPopulation),
                  growthRateBonus: editGrowth,
                })
                setEditOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        }
      >
        <FormField label="Name" htmlFor="edit-city-name">
          <Input
            id="edit-city-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
        </FormField>
        <FormField label="Population" htmlFor="edit-city-pop">
          <Input
            id="edit-city-pop"
            type="number"
            min={1}
            value={editPopulation}
            onChange={(e) => setEditPopulation(Number(e.target.value))}
          />
        </FormField>
        <FormField label="Growth rate bonus" htmlFor="edit-city-growth">
          <Input
            id="edit-city-growth"
            type="number"
            step={0.01}
            value={editGrowth}
            onChange={(e) => setEditGrowth(Number(e.target.value))}
          />
        </FormField>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete city"
        message={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? This does not clear tile terrain.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          removeCity(tileKey(pendingDelete.coord))
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
