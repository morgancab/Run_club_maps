import type { Language } from '../RunClubMap'

interface HeaderProps {
  language: Language
  setLanguage: (language: Language) => void
  onOpenAbout: () => void
  onOpenSuggest: () => void
  view: 'site' | 'swipe'
  onGoHome: () => void
  onGoCarte: () => void
  onGoSwipe: () => void
}

export default function Header({
  language,
  setLanguage,
  onOpenAbout,
  onOpenSuggest,
  view,
  onGoHome,
  onGoCarte,
  onGoSwipe,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-ink-line bg-paper/90 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onGoHome}
        className="shrink-0 font-display text-base font-bold uppercase tracking-tight text-ink sm:text-lg"
      >
        Run Club <span className="text-accent">Maps</span>
      </button>

      <nav className="flex items-center gap-3 text-sm sm:gap-5" aria-label="Navigation principale">
        {/* Onglet dédié pour le mode découverte façon Tinder */}
        <button
          type="button"
          onClick={onGoSwipe}
          aria-pressed={view === 'swipe'}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors sm:px-4 ${
            view === 'swipe'
              ? 'border-accent bg-accent text-ink'
              : 'border-accent/30 bg-accent-soft text-accent hover:border-accent/60'
          }`}
        >
          <span aria-hidden="true">🔥</span>
          <span className="hidden sm:inline"> Trouve ton club</span>
        </button>

        <button
          type="button"
          onClick={onGoCarte}
          className="hidden font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-ink sm:inline-block"
        >
          Carte
        </button>
        <button
          type="button"
          onClick={onOpenAbout}
          className="hidden font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-ink sm:inline-block"
        >
          À propos
        </button>

        {/* Sélecteur de langue, unique pour tout le site */}
        <div
          className="flex shrink-0 overflow-hidden rounded-sm border border-ink-line"
          role="group"
          aria-label={language === 'fr' ? 'Sélection de langue' : 'Language selection'}
        >
          <button
            type="button"
            onClick={() => setLanguage('fr')}
            className={`flex min-h-[32px] min-w-[32px] items-center justify-center px-2 text-[11px] font-semibold transition-colors ${language === 'fr' ? 'bg-accent text-ink' : 'text-concrete hover:text-ink'}`}
            aria-label="Français"
            aria-pressed={language === 'fr'}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`flex min-h-[32px] min-w-[32px] items-center justify-center px-2 text-[11px] font-semibold transition-colors ${language === 'en' ? 'bg-accent text-ink' : 'text-concrete hover:text-ink'}`}
            aria-label="English"
            aria-pressed={language === 'en'}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSuggest}
          className="hidden shrink-0 whitespace-nowrap rounded-sm bg-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink shadow-[0_2px_10px_rgba(255,85,0,0.3)] transition-transform hover:-translate-y-0.5 sm:inline-block sm:px-5 sm:text-sm"
        >
          Proposer un club
        </button>
      </nav>
    </header>
  );
}
