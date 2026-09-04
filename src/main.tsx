import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryProvider } from './api/query'
import App from './App.tsx'
import './index.css'

const resourceEntries = performance.getEntriesByType.bind(performance)
performance.getEntriesByType = (type: string) =>
  Array.from(resourceEntries(type)).filter((entry) => entry != null)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)
