import { useState } from 'react'
import RunClubMap, { type Language } from './RunClubMap'
import Header from './components/Header'
import Hero from './components/Hero'
import ClubSwiper from './components/ClubSwiper'
import Footer from './components/Footer'
import SuggestClubModal from './components/SuggestClubModal'
import { useGeolocation } from './hooks/useGeolocation'

type View = 'site' | 'swipe'

function App() {
  const [language, setLanguage] = useState<Language>('fr')
  const [showInfoPopup, setShowInfoPopup] = useState(false)
  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [view, setView] = useState<View>('site')
  // Demandée une seule fois, dès l'arrivée sur le site, et partagée par la
  // carte et le mode swipe (tri du plus proche au plus loin).
  const { userLocation, geoStatus } = useGeolocation()

  // Retourne à la page principale, en scrollant éventuellement vers une section
  // (le scroll est reporté à la frame suivante pour laisser la section se remonter).
  const goToSite = (scrollTargetId?: string) => {
    setView('site')
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Header
        language={language}
        setLanguage={setLanguage}
        onOpenAbout={() => setShowInfoPopup(true)}
        onOpenSuggest={() => setShowSuggestForm(true)}
        view={view}
        onGoHome={() => goToSite()}
        onGoCarte={() => goToSite('carte')}
        onGoSwipe={goToSwipe}
      />

      {/* La page principale reste montée (display: none plutôt que démontage) pour
          ne pas perdre l'état de la carte Leaflet ni la position de scroll quand on
          va et vient depuis l'onglet "Trouve ton club". */}
      <div className={view === 'site' ? 'contents' : 'hidden'}>
        <Hero language={language} onGoSwipe={goToSwipe} onOpenSuggest={() => setShowSuggestForm(true)} />
        <section id="carte" className="scroll-mt-16 bg-paper-soft px-4 pb-10 pt-2 sm:px-6 sm:pt-10 lg:px-16">
          <div className="relative isolate mx-auto h-[80vh] max-h-[880px] min-h-[520px] w-full max-w-6xl overflow-hidden rounded-xl border border-ink-line shadow-[0_16px_40px_rgba(18,21,26,0.1)]">
            <RunClubMap
              language={language}
              showInfoPopup={showInfoPopup}
              setShowInfoPopup={setShowInfoPopup}
              active={view === 'site'}
              userLocation={userLocation}
              geoStatus={geoStatus}
              onOpenSuggest={() => setShowSuggestForm(true)}
            />
          </div>
        </section>
        <Footer language={language} onOpenSuggest={() => setShowSuggestForm(true)} />
      </div>

      {view === 'swipe' && (
        <ClubSwiper language={language} onBack={() => goToSite()} userLocation={userLocation} />
      )}

      <SuggestClubModal
        language={language}
        open={showSuggestForm}
        onClose={() => setShowSuggestForm(false)}
      />
    </div>
  )
}

export default App
