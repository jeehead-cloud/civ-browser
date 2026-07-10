import { useGameStore } from '../game/store'

export function PlayersPanel() {
  const civilizations = useGameStore((s) => s.game.civilizations)
  const cities = useGameStore((s) => s.game.cities)
  const gamePhase = useGameStore((s) => s.gamePhase)

  if (gamePhase !== 'playing') return null

  const unclaimedCount = cities.filter((c) => c.civId === null).length

  return (
    <div style={{ padding: 16, borderTop: '1px solid #ddd' }}>
      <h4>Игроки</h4>
      {civilizations.map((civ) => {
        const civCities = cities.filter((c) => c.civId === civ.id)
        const totalPopulation = civCities.reduce((sum, c) => sum + c.population, 0)
        return (
          <div key={civ.id} style={{ marginBottom: 8, fontSize: 13 }}>
            <div>
              {civ.flagEmoji} <strong>{civ.name}</strong>
            </div>
            <div style={{ color: '#666' }}>
              Городов: {civCities.length} · Население: {totalPopulation}
            </div>
          </div>
        )
      })}
      <div style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
        Свободных городов: {unclaimedCount}
      </div>
    </div>
  )
}
