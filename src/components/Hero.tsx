import type { Language } from '../RunClubMap'
import { translations } from '../i18n'
import HeroMap from './HeroMap'

interface HeroProps {
  language: Language
  onGoSwipe: () => void
  onOpenSuggest: () => void
}

export default function Hero({ language, onGoSwipe, onOpenSuggest }: HeroProps) {
  const t = translations[language]

  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-paper px-4 pb-8 pt-8 sm:px-6 sm:pb-16 sm:pt-16 lg:px-16"
    >
      {/* Vraie carte Leaflet (même fond de carte que la carte principale),
          non interactive, avec les logos des clubs à leurs positions
          géographiques réelles — voir src/components/HeroMap.tsx. */}
      <HeroMap />

      {/* z-10 explicite : garantit que tout ce qui suit (voile, tracé,
          texte) peint au-dessus du contexte d'empilement isolé de HeroMap,
          sans dépendre de l'ordre du DOM (voir commentaire dans HeroMap.tsx). */}
      <div className="relative z-10">
      {/* Voile clair au-dessus de la carte : assure la lisibilité du texte
          par-dessus des tuiles/pins réels, tout en laissant deviner la carte
          sur les bords. Dégradé radial centré sur le bloc de texte + fondu
          haut/bas vers le blanc pour raccorder proprement avec le reste de
          la page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 60% at 50% 42%, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.75) 45%, rgba(255,255,255,0.35) 72%, rgba(255,255,255,0.08) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0) 14%, rgba(255,255,255,0) 82%, #ffffff 100%)',
        }}
      />

      {/* Tracé GPS décoratif par-dessus la carte : évoque un parcours de
          course. Dessiné une fois au chargement (stroke-dashoffset), puis un
          point continue de le parcourir en boucle — la "référence à la
          course". Un léger halo blanc sous le tracé garde le trait lisible
          par-dessus les tuiles de la carte. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 360"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <path
          d="M -40 300 C 120 300, 160 180, 300 190 S 420 300, 520 260 S 640 80, 760 110 S 900 40, 1040 70"
          fill="none"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          id="hero-route"
          d="M -40 300 C 120 300, 160 180, 300 190 S 420 300, 520 260 S 640 80, 760 110 S 900 40, 1040 70"
          fill="none"
          stroke="#ff8c42"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1400"
          className="animate-[route-draw_2.4s_ease-out_forwards]"
        />
        <circle cx="-40" cy="300" r="6" fill="#ff5500" />
        <circle cx="1040" cy="70" r="6" fill="none" stroke="#ff5500" strokeWidth="3" />

        {/* Le "coureur" : un point qui parcourt le tracé en continu. */}
        <circle r="7" fill="#ff5500">
          <animateMotion dur="7s" begin="2.4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#hero-route" xlinkHref="#hero-route" />
          </animateMotion>
        </circle>
      </svg>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-10%] h-[360px] w-[360px] rounded-full bg-accent/10 blur-[110px]"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {t.heroBadge}
        </span>

        <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:mt-6 sm:text-6xl lg:text-7xl">
          {t.heroHeadingPrefix}
          <span className="block text-accent">run club</span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-concrete sm:mt-6 sm:text-lg">
          {t.heroParagraph}
        </p>

        {/* Bandeau de stats : les chiffres clés traités comme un vrai élément
            visuel (typo scoreboard), à la manière d'un résumé de sortie. */}
        <div className="mx-auto mt-7 flex max-w-md items-stretch justify-center divide-x divide-ink-line sm:mt-10">
          <div className="flex flex-1 flex-col px-3">
            <span className="font-stat text-4xl leading-none text-ink sm:text-5xl">100+</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete sm:text-xs">{t.heroStatClubs}</span>
          </div>
          <div className="flex flex-1 flex-col px-3">
            <span className="font-stat text-4xl leading-none text-accent sm:text-5xl">7/7</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete sm:text-xs">{t.heroStatDays}</span>
          </div>
          <div className="flex flex-1 flex-col px-3">
            <span className="font-stat text-4xl leading-none text-ink sm:text-5xl">0€</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete sm:text-xs">{t.heroStatFree}</span>
          </div>
        </div>

        <div className="mt-7 flex flex-row items-center justify-center gap-2 sm:mt-9 sm:gap-3">
          <a
            href="#carte"
            className="flex-1 rounded-md bg-accent px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-ink shadow-[0_10px_24px_rgba(255,85,0,0.28)] transition-transform hover:-translate-y-0.5 sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm"
          >
            {t.heroCtaMap}
          </a>
          <button
            type="button"
            onClick={onOpenSuggest}
            className="flex-1 rounded-md border border-ink-line px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent sm:flex-none sm:px-7 sm:py-3.5 sm:text-sm"
          >
            {t.heroCtaSuggest}
          </button>
        </div>

        <button
          type="button"
          onClick={onGoSwipe}
          className="mt-4 inline-block text-xs font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent sm:mt-6"
        >
          {t.heroSwipeLink}
        </button>
      </div>
      </div>

      <style>{`
        @keyframes route-draw {
          from { stroke-dashoffset: 1400; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes hero-map-pin-in {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
        .hero-map-pin-inner {
          display: block;
          width: 100%;
          height: 100%;
          opacity: 0;
          animation: hero-map-pin-in 0.45s ease-out both;
        }
        .hero-map-pin-inner img {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          object-fit: cover;
          border: 2px solid #ffffff;
          box-shadow: 0 6px 14px rgba(18, 21, 26, 0.24);
        }
        .hero-leaflet-map .leaflet-control-attribution {
          font-size: 9px;
          opacity: 0.55;
          background: transparent;
        }
        @media (prefers-reduced-motion: reduce) {
          svg path { animation: none !important; stroke-dashoffset: 0 !important; }
          svg animateMotion { display: none; }
          .hero-map-pin-inner { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </section>
  );
}
