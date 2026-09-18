import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Chargée en dynamic import : reste dans un chunk séparé, jamais téléchargée
// par un visiteur normal du site. Pas de lien vers /admin dans la nav/sitemap
// (voir robots.txt) — le vrai contrôle d'accès est fait côté serveur
// (lib/adminAuth) via Supabase Auth + ADMIN_EMAIL.
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))
const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
