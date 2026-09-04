import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BrowsePage } from './pages/BrowsePage'
import { HomePage } from './pages/HomePage'
import { RatingsPage } from './pages/RatingsPage'
import { ShowPage } from './pages/ShowPage'
import { StatsPage } from './pages/StatsPage'
import { WatchlistPage } from './pages/StatusCatalogPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="ratings" element={<RatingsPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="stopped" element={<Navigate to="/ratings" replace />} />
          <Route path="show/:id" element={<ShowPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
