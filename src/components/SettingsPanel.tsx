import { useGameStore } from '../game/store'

export function SettingsPanel() {
  const settings = useGameStore((s) => s.game.settings)
  const setGameSettings = useGameStore((s) => s.setGameSettings)

  return (
    <div style={{ padding: 16, borderTop: '1px solid #ddd' }}>
      <h4>Глобальные настройки</h4>
      <p style={{ fontSize: 12, color: '#666', marginTop: 0 }}>
        Current simulation settings — not the global preset catalog. Edit reusable presets under Settings &amp;
        Balance.
      </p>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 13 }}>
          Базовый рост городов за ход (%)
        </label>
        <input
          type="number"
          step={0.1}
          value={settings.baseGrowthRate * 100}
          onChange={(e) => setGameSettings({ baseGrowthRate: Number(e.target.value) / 100 })}
          style={{ width: '100%', padding: 4, boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 13 }}>
          Культура столицы за ход
        </label>
        <input
          type="number"
          value={settings.capitalCulturePerTurn}
          onChange={(e) => setGameSettings({ capitalCulturePerTurn: Number(e.target.value) })}
          style={{ width: '100%', padding: 4, boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 13 }}>
          Культура для присоединения соседнего города
        </label>
        <input
          type="number"
          value={settings.cultureAnnexThreshold}
          onChange={(e) => setGameSettings({ cultureAnnexThreshold: Number(e.target.value) })}
          style={{ width: '100%', padding: 4, boxSizing: 'border-box' }}
        />
      </div>
    </div>
  )
}
