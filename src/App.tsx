import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MainMenuPage } from './pages/MainMenuPage'
import { LibraryHomePage } from './pages/LibraryHomePage'
import { MapsCatalogPage } from './pages/MapsCatalogPage'
import { CivilizationsCatalogPage } from './pages/CivilizationsCatalogPage'
import { SettingsBalancePage } from './pages/SettingsBalancePage'
import { NewGamePage } from './pages/NewGamePage'
import { ActiveGamePage } from './pages/ActiveGamePage'
import { WorldEditorPage } from './pages/WorldEditorPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenuPage />} />
        <Route path="/library" element={<LibraryHomePage />} />
        <Route path="/library/maps" element={<MapsCatalogPage />} />
        <Route path="/library/maps/current/edit" element={<WorldEditorPage />} />
        <Route path="/library/civilizations" element={<CivilizationsCatalogPage />} />
        <Route path="/settings" element={<SettingsBalancePage />} />
        <Route path="/games/new" element={<NewGamePage />} />
        <Route path="/games/:gameId" element={<ActiveGamePage />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
