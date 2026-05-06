import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Spinner from './components/Spinner.tsx'

const TripDetail = lazy(() => import('./pages/TripDetail.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/trip/:id" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner /></div>}>
            <TripDetail />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
