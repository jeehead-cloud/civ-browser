import { useState } from 'react'
import { useGameStore } from '../game/store'

export function CityModal() {
  const addingCityAtKey = useGameStore((s) => s.addingCityAtKey)
  const setAddingCityAt = useGameStore((s) => s.setAddingCityAt)
  const addCity = useGameStore((s) => s.addCity)
  const [name, setName] = useState('')
  const [population, setPopulation] = useState(1)

  if (!addingCityAtKey) return null

  function handleCreate() {
    const finalName = name.trim() || 'Новый город'
    addCity(addingCityAtKey!, finalName, Math.max(1, population))
    setName('')
    setPopulation(1)
    setAddingCityAt(null)
  }

  function handleCancel() {
    setName('')
    setPopulation(1)
    setAddingCityAt(null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, width: 320 }}>
        <h3 style={{ marginTop: 0 }}>Основать город</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Новый город"
            style={{ width: '100%', padding: 6, boxSizing: 'border-box' }}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Стартовое население</label>
          <input
            type="number"
            min={1}
            value={population}
            onChange={(e) => setPopulation(Number(e.target.value))}
            style={{ width: '100%', padding: 6, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleCancel}>Отмена</button>
          <button onClick={handleCreate}>Создать</button>
        </div>
      </div>
    </div>
  )
}
