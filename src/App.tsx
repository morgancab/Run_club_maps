import { useState } from 'react'
import RunClubMap, { type Language } from './RunClubMap'
import Header from './components/Header'
import Hero from './components/Hero'
import Footer from './components/Footer'

function App() {
  const [language, setLanguage] = useState<Language>('fr')
  const [showInfoPopup, setShowInfoPopup] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header
        language={language}
        setLanguage={setLanguage}
        onOpenAbout={() => setShowInfoPopup(true)}
      />
      <Hero />
      <section id="carte" className="scroll-mt-16 px-4 py-10 sm:px-6 lg:px-16">
        <div className="relative isolate mx-auto h-[80vh] max-h-[880px] min-h-[520px] w-full max-w-6xl overflow-hidden rounded-lg border border-ink-line shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <RunClubMap
            language={language}
            showInfoPopup={showInfoPopup}
            setShowInfoPopup={setShowInfoPopup}
          />
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default App
