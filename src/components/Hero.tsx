interface HeroProps {
  onGoSwipe: () => void
  onOpenSuggest: () => void
}

export default function Hero({ onGoSwipe, onOpenSuggest }: HeroProps) {
  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-paper px-4 pb-8 pt-8 sm:px-6 sm:pb-16 sm:pt-16 lg:px-16"
    >
      {/* Tracé GPS décoratif : évoque un parcours vu du dessus plutôt qu'un
          simple halo. Dessiné une fois au chargement (stroke-dashoffset). */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 360"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.55]"
      >
        <path
          d="M -40 300 C 120 300, 160 180, 300 190 S 420 300, 520 260 S 640 80, 760 110 S 900 40, 1040 70"
          fill="none"
          stroke="#ffdcc4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1400"
          className="animate-[route-draw_2.4s_ease-out_forwards]"
        />
        <circle cx="-40" cy="300" r="6" fill="#ff5500" />
        <circle cx="1040" cy="70" r="6" fill="none" stroke="#ff5500" strokeWidth="3" />
      </svg>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-10%] h-[360px] w-[360px] rounded-full bg-accent/10 blur-[110px]"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Communauté running
        </span>

        <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:mt-6 sm:text-6xl lg:text-7xl">
          Trouve ton
          <span className="block text-accent">run club</span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-concrete sm:mt-6 sm:text-lg">
          Plus de 100 clubs de course à pied référencés partout en France.
          Filtre par ville et par jour de sortie, repère le club le plus
          proche de chez toi et rejoins la communauté. Jamais seul sur la ligne de départ.
        </p>

        {/* Bandeau de stats : les chiffres clés traités comme un vrai élément
            visuel (typo scoreboard), à la manière d'un résumé de sortie. */}
        <div className="mx-auto mt-7 flex max-w-md items-stretch justify-center divide-x divide-ink-line sm:mt-10">
          <div className="flex flex-1 flex-col px-3">
            <span className="font-stat text-4xl leading-none text-ink sm:text-5xl">100+</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete sm:text-xs">Clubs référencés</span>
          </div>
          <div className="flex flex-1 flex-col px-3">
            <span className="font-stat text-4xl leading-none text-accent sm:text-5xl">7/7</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete sm:text-xs">Jours de sortie</span>
          </div>
          <div className="flex flex-1 flex-col px-3">
            <span className="font-stat text-4xl leading-none text-ink sm:text-5xl">0€</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete sm:text-xs">Sans engagement</span>
          </div>
        </div>

        <div className="mt-7 flex flex-row items-center justify-center gap-2 sm:mt-9 sm:gap-3">
          <a
            href="#carte"
            className="flex-1 rounded-md bg-accent px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-ink shadow-[0_10px_24px_rgba(255,85,0,0.28)] transition-transform hover:-translate-y-0.5 sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm"
          >
            ↓ Voir la carte
          </a>
          <button
            type="button"
            onClick={onOpenSuggest}
            className="flex-1 rounded-md border border-ink-line px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm"
          >
            Référencer mon club
          </button>
        </div>

        <button
          type="button"
          onClick={onGoSwipe}
          className="mt-4 inline-block text-xs font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent sm:mt-6"
        >
          🔥 Ou découvre tes clubs façon swipe
        </button>
      </div>

      <style>{`
        @keyframes route-draw {
          from { stroke-dashoffset: 1400; }
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          svg path { animation: none !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </section>
  );
}
