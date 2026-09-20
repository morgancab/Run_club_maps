import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Chargées en dynamic import : chacune reste dans un chunk séparé, jamais
// téléchargé par un visiteur normal du site.
// - /admin : pas de lien dans la nav/sitemap (voir robots.txt), contrôle
//   d'accès serveur via Supabase Auth + ADMIN_EMAIL (lib/adminAuth).
// - /mon-club : lien dans le Footer (inscription libre pour les owners),
//   contrôle d'accès serveur via Supabase Auth + owner_email (lib/ownerAuth) —
//   un compte ne voit que les clubs qui lui ont été attribués par l'admin.
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))
const OwnerApp = lazy(() => import('./owner/OwnerApp.tsx'))
const path = window.location.pathname.replace(/\/+$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {path === '/admin' ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : path === '/mon-club' ? (
      <Suspense fallback={null}>
        <OwnerApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
