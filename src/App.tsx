import { useEffect, useState } from 'react'
import RunClubMap, { type Language } from './RunClubMap'
import Header from './components/Header'
import Hero from './components/Hero'
import ClubSwiper from './components/ClubSwiper'
import Footer from './components/Footer'
import SuggestClubModal from './components/SuggestClubModal'
import { useGeolocation } from './hooks/useGeolocation'

type View = 'site' | 'swipe'

// Liens directs partageables (ex: en bio Instagram) qui ouvrent un écran précis
// sans passer par la page d'accueil. Nécessite le rewrite SPA dans vercel.json
// pour ne pas faire 404 sur ces chemins en prod.
const SUGGEST_ROUTES = ['/proposer-un-club', '/proposer', '/ajouter-club', '/ajouter-un-club', '/add-club', '/suggest-a-club']
const SWIPE_ROUTES = ['/swipe', '/decouvrir', '/discover']
const SUGGEST_PATH = '/proposer-un-club'
const SWIPE_PATH = '/swipe'

function normalizedPath() {
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

function App() {
  const [language, setLanguage] = useState<Language>('fr')
  const [showInfoPopup, setShowInfoPopup] = useState(false)
  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [view, setView] = useState<View>(() => (SWIPE_ROUTES.includes(normalizedPath()) ? 'swipe' : 'site'))
  // Demandée une seule fois, dès l'arrivée sur le site, et partagée par la
  // carte et le mode swipe (tri du plus proche au plus loin).
  const { userLocation, geoStatus } = useGeolocation()

  // Ouvre directement le formulaire si l'utilisateur arrive via un lien dédié
  // (ex: runclubmaps.com/proposer-un-club), et garde l'URL synchronisée avec
  // le bouton précédent/suivant du navigateur.
  useEffect(() => {
    if (SUGGEST_ROUTES.includes(normalizedPath())) {
      setShowSuggestForm(true)
    }
    const onPopState = () => {
      const path = normalizedPath()
      setShowSuggestForm(SUGGEST_ROUTES.includes(path))
      setView(SWIPE_ROUTES.includes(path) ? 'swipe' : 'site')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const openSuggestForm = () => {
    setShowSuggestForm(true)
    window.history.pushState({}, '', SUGGEST_PATH)
  }

  const closeSuggestForm = () => {
    setShowSuggestForm(false)
    window.history.pushState({}, '', '/')
  }

  // Retourne à la page principale, en scrollant éventuellement vers une section
  // (le scroll est reporté à la frame suivante pour laisser la section se remonter).
  const goToSite = (scrollTargetId?: string) => {
    setView('site')
    window.history.pushState({}, '', '/')
    requestAnimationFrame(() => {
      if (scrollTargetId) {
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  const goToSwipe = () => {
    setView('swipe')
    window.history.pushState({}, '', SWIPE_PATH)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Header
        language={language}
        setLanguage={setLanguage}
        onOpenAbout={() => setShowInfoPopup(true)}
        onOpenSuggest={openSuggestForm}
        view={view}
        onGoHome={() => goToSite()}
        onGoCarte={() => goToSite('carte')}
        onGoSwipe={goToSwipe}
      />

      {/* La page principale reste montée (display: none plutôt que démontage) pour
          ne pas perdre l'état de la carte Leaflet ni la position de scroll quand on
          va et vient depuis l'onglet "Trouve ton club". */}
      <div className={view === 'site' ? 'contents' : 'hidden'}>
        <Hero language={language} onGoSwipe={goToSwipe} onOpenSuggest={openSuggestForm} />
        <section id="carte" className="scroll-mt-16 bg-paper-soft px-4 pb-10 pt-2 sm:px-6 sm:pt-10 lg:px-16">
          <div className="relative isolate mx-auto h-[80vh] max-h-[880px] min-h-[520px] w-full max-w-6xl overflow-hidden rounded-xl border border-ink-line shadow-[0_16px_40px_rgba(18,21,26,0.1)]">
            <RunClubMap
              language={language}
              showInfoPopup={showInfoPopup}
              setShowInfoPopup={setShowInfoPopup}
              active={view === 'site'}
              userLocation={userLocation}
              geoStatus={geoStatus}
              onOpenSuggest={openSuggestForm}
            />
          </div>
        </section>
        <Footer language={language} onOpenSuggest={openSuggestForm} />
      </div>

      {view === 'swipe' && (
        <ClubSwiper language={language} onBack={() => goToSite()} userLocation={userLocation} />
      )}

      <SuggestClubModal
        language={language}
        open={showSuggestForm}
        onClose={closeSuggestForm}
      />
    </div>
  )
}

export default App
