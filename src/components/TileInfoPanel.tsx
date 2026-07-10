import { useState, useEffect } from 'react'
import { useGameStore } from '../game/store'

export function TileInfoPanel() {
  const viewingTileKey = useGameStore((s) => s.viewingTileKey)
  const setViewingTile = useGameStore((s) => s.setViewingTile)
  const tile = useGameStore((s) => (viewingTileKey ? s.game.tiles[viewingTileKey] : null))
  const cities = useGameStore((s) => s.game.cities)
  const civilizations = useGameStore((s) => s.game.civilizations)
  const settings = useGameStore((s) => s.game.settings)
  const viewMode = useGameStore((s) => s.viewMode)
  const setCityGrowthBonus = useGameStore((s) => s.setCityGrowthBonus)

  const city = tile?.cityId ? cities.find((c) => c.id === tile.cityId) : null
  const civ = city?.civId ? civilizations.find((c) => c.id === city.civId) : null

  const [bonusInput, setBonusInput] = useState('0')

  useEffect(() => {
    if (city) setBonusInput(String((city.growthRateBonus * 100).toFixed(2)))
  }, [city?.id, city?.growthRateBonus])

  if (!viewingTileKey || !tile) return null

  const totalGrowthRate = city ? settings.baseGrowthRate + city.growthRateBonus : 0
  const cultureOutput = city?.isCapital ? settings.capitalCulturePerTurn : 0

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: 16,
        width: 280,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>
          Гекс ({tile.coord.q}, {tile.coord.r})
        </h4>
        <button
          onClick={() => setViewingTile(null)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}
        >
          ×
        </button>
      </div>
      <p style={{ margin: '8px 0 4px' }}>Ландшафт: {tile.terrain}</p>
      <p style={{ margin: '4px 0' }}>Растительность: {tile.vegetation}</p>
      <p style={{ margin: '4px 0' }}>Холмы: {tile.hasHills ? 'да' : 'нет'}</p>
      <p style={{ margin: '4px 0' }}>Ресурс: {tile.resource}</p>
      <p style={{ margin: '4px 0' }}>Река: {tile.riverDirections.length > 0 ? 'да' : 'нет'}</p>

      {city && (
        <>
          <hr />
          <p style={{ margin: '4px 0' }}>
            <strong>{city.name}</strong>
            {city.isCapital && ' 👑'}
          </p>
          <p style={{ margin: '4px 0' }}>Население: {city.population}</p>
          <p style={{ margin: '4px 0' }}>
            Цивилизация: {civ ? `${civ.flagEmoji} ${civ.name} (${civ.cultureName})` : 'нет (свободный город)'}
          </p>
          <p style={{ margin: '4px 0' }}>
            Рост за ход: {(totalGrowthRate * 100).toFixed(2)}% (база {(settings.baseGrowthRate * 100).toFixed(2)}% + бонус {(city.growthRateBonus * 100).toFixed(2)}%)
          </p>
          {city.isCapital && (
            <p style={{ margin: '4px 0' }}>
              Культура: {city.culture.toFixed(1)} (+{cultureOutput}/ход, нужно {settings.cultureAnnexThreshold} для присоединения соседа)
            </p>
          )}

          {viewMode === 'edit' && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: 12 }}>Бонус к росту города (%)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number"
                  step={0.1}
                  value={bonusInput}
                  onChange={(e) => setBonusInput(e.target.value)}
                  style={{ width: '100%', padding: 4, boxSizing: 'border-box' }}
                />
                <button onClick={() => setCityGrowthBonus(city.id, Number(bonusInput) / 100)}>
                  ОК
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
