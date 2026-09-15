export default function Hero() {
  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-ink px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-16"
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

        <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-paper sm:text-5xl lg:text-6xl">
          Trouve ton
          <span className="block text-accent">run club</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-concrete sm:text-lg">
          Plus de 100 clubs de course à pied référencés partout en France.
          Filtre par ville et par jour de sortie, repère le club le plus
          proche de chez toi et rejoins la communauté. Jamais seul sur la ligne de départ.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#carte"
            className="w-full rounded-sm bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-ink shadow-[0_4px_20px_rgba(255,85,0,0.4)] transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            ↓ Voir la carte
          </a>
          <a
            href="https://forms.gle/H4r6NMeHp1dtCq1U9"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-sm border border-ink-line px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-paper transition-colors hover:border-accent hover:text-accent sm:w-auto"
          >
            Référencer mon club
          </a>
        </div>
      </div>
    </section>
  );
}
