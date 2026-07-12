import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { MainMenuPage } from './pages/MainMenuPage'
import { LibraryHomePage } from './pages/LibraryHomePage'
import { MapsCatalogPage } from './pages/MapsCatalogPage'
import { CivilizationsCatalogPage } from './pages/CivilizationsCatalogPage'
import { SettingsBalancePage } from './pages/SettingsBalancePage'
import { NewGamePage } from './pages/NewGamePage'
import { ActiveGamePage } from './pages/ActiveGamePage'
import { WorldEditorPage } from './pages/WorldEditorPage'
import { NotFoundPage } from './pages/NotFoundPage'

const router = createBrowserRouter([
  { path: '/', element: <MainMenuPage /> },
  { path: '/library', element: <LibraryHomePage /> },
  { path: '/library/maps', element: <MapsCatalogPage /> },
  { path: '/library/maps/:mapId/edit', element: <WorldEditorPage /> },
  { path: '/library/civilizations', element: <CivilizationsCatalogPage /> },
  { path: '/settings', element: <SettingsBalancePage /> },
  { path: '/games/new', element: <NewGamePage /> },
  { path: '/games/:gameId', element: <ActiveGamePage /> },
  { path: '/index.html', element: <Navigate to="/" replace /> },
  { path: '*', element: <NotFoundPage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
