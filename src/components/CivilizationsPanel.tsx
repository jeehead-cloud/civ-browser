import { useState } from 'react'
import { useGameStore } from '../game/store'

const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899']
const FLAG_SUGGESTIONS = ['🦅', '🦁', '🐉', '⚔️', '🏛️', '👑', '🔱', '🌊', '☀️', '🌙', '⭐', '🐺']

export function CivilizationsPanel() {
  const civilizations = useGameStore((s) => s.game.civilizations)
  const cities = useGameStore((s) => s.game.cities)
  const addCivilization = useGameStore((s) => s.addCivilization)
  const removeCivilization = useGameStore((s) => s.removeCivilization)
  const assigningCapitalForCivId = useGameStore((s) => s.assigningCapitalForCivId)
  const setAssigningCapitalFor = useGameStore((s) => s.setAssigningCapitalFor)

  const [newName, setNewName] = useState('')
  const [newCulture, setNewCulture] = useState('')
  const [newFlag, setNewFlag] = useState(FLAG_SUGGESTIONS[0])

  function handleAdd() {
    if (!newName.trim()) return
    const color = DEFAULT_COLORS[civilizations.length % DEFAULT_COLORS.length]
    addCivilization(newName.trim(), color, newCulture.trim() || newName.trim(), newFlag)
    setNewName('')
    setNewCulture('')
  }

  return (
    <div style={{ padding: 16, width: 280, borderLeft: '1px solid #ddd' }}>
      <h3>Цивилизации</h3>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Название"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ width: '100%', marginBottom: 4, padding: 4, boxSizing: 'border-box' }}
        />
        <input
          type="text"
          placeholder="Культура (например Египтяне)"
          value={newCulture}
          onChange={(e) => setNewCulture(e.target.value)}
          style={{ width: '100%', marginBottom: 4, padding: 4, boxSizing: 'border-box' }}
        />
        <div style={{ marginBottom: 4 }}>
          Флаг:{' '}
          {FLAG_SUGGESTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setNewFlag(f)}
              style={{
                fontSize: 16,
                marginRight: 2,
                border: f === newFlag ? '2px solid #333' : '1px solid #ccc',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={handleAdd}>Добавить цивилизацию</button>
      </div>

      {civilizations.map((civ) => {
        const capital = cities.find((c) => c.id === civ.capitalCityId)
        const isAssigning = assigningCapitalForCivId === civ.id
        return (
          <div key={civ.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>{civ.flagEmoji}</span>
              <strong>{civ.name}</strong>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: civ.color,
                  display: 'inline-block',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>{civ.cultureName}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Столица: {capital ? capital.name : 'не назначена'}
            </div>
            <button
              onClick={() => setAssigningCapitalFor(isAssigning ? null : civ.id)}
              style={{ marginTop: 4, fontWeight: isAssigning ? 'bold' : 'normal' }}
            >
              {isAssigning ? 'Кликни по городу на карте…' : 'Назначить столицу'}
            </button>{' '}
            <button onClick={() => removeCivilization(civ.id)} style={{ marginTop: 4 }}>
              Удалить
            </button>
          </div>
        )
      })}
    </div>
  )
}
