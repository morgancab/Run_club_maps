interface HeroProps {
  onGoSwipe: () => void
}

export default function Hero({ onGoSwipe }: HeroProps) {
  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-ink px-4 pb-6 pt-8 sm:px-6 sm:pb-14 sm:pt-16 lg:px-16"
    >
      {/* Halo orange décoratif */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-15%] left-[-10%] h-[320px] w-[320px] rounded-full bg-accent/10 blur-[100px]"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
          🏃 Communauté running
        </span>

        <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight text-paper sm:mt-6 sm:text-5xl lg:text-6xl">
          Trouve ton
          <span className="block text-accent">run club</span>
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-balance text-sm leading-relaxed text-concrete sm:mt-6 sm:text-lg">
          Plus de 100 clubs de course à pied référencés partout en France.
          Filtre par ville et par jour de sortie, repère le club le plus
          proche de chez toi et rejoins la communauté. Jamais seul sur la ligne de départ.
        </p>

        <div className="mt-5 flex flex-row items-center justify-center gap-2 sm:mt-9 sm:gap-3">
          <a
            href="#carte"
            className="flex-1 rounded-sm bg-accent px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-ink shadow-[0_4px_20px_rgba(255,85,0,0.4)] transition-transform hover:-translate-y-0.5 sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm"
          >
            ↓ Voir la carte
          </a>
          <a
            href="https://forms.gle/H4r6NMeHp1dtCq1U9"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-sm border border-ink-line px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-paper transition-colors hover:border-accent hover:text-accent sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm"
          >
            Référencer mon club
          </a>
        </div>

        <button
          type="button"
          onClick={onGoSwipe}
          className="mt-3 inline-block text-xs font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent sm:mt-5"
        >
          🔥 Ou découvre tes clubs façon swipe
        </button>
      </div>
    </section>
  );
}
