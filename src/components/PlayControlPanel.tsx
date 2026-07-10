import { useState } from 'react'
import { useGameStore } from '../game/store'

export function PlayControlPanel() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const currentYear = useGameStore((s) => s.currentYear)
  const yearsPerTurn = useGameStore((s) => s.yearsPerTurn)
  const turn = useGameStore((s) => s.game.turn)
  const startGame = useGameStore((s) => s.startGame)
  const endTurn = useGameStore((s) => s.endTurn)

  const [startYear, setStartYear] = useState(-4000)
  const [stepYears, setStepYears] = useState(10)

  function formatYear(year: number) {
    return year < 0 ? `${Math.abs(year)} до н.э.` : `${year} н.э.`
  }

  if (gamePhase === 'setup') {
    return (
      <div style={{ padding: 16, borderTop: '1px solid #ddd' }}>
        <h4>Начать партию</h4>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 13 }}>Стартовый год (отрицательный = до н.э.)</label>
          <input
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
            style={{ width: '100%', padding: 4, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 13 }}>Лет за ход</label>
          <input
            type="number"
            value={stepYears}
            onChange={(e) => setStepYears(Number(e.target.value))}
            style={{ width: '100%', padding: 4, boxSizing: 'border-box' }}
          />
        </div>
        <button onClick={() => startGame(startYear, stepYears)}>Играть</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, borderTop: '1px solid #ddd' }}>
      <h4>Партия идёт</h4>
      <p style={{ margin: '4px 0' }}>Год: {formatYear(currentYear)}</p>
      <p style={{ margin: '4px 0' }}>Ход: {turn}</p>
      <button onClick={endTurn}>Следующий ход</button>
    </div>
  )
}
