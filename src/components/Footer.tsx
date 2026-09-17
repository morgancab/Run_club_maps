interface FooterProps {
  onOpenSuggest: () => void
}

export default function Footer({ onOpenSuggest }: FooterProps) {
  return (
    <footer className="border-t border-ink-line bg-paper px-4 py-12 sm:px-6 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-tight text-ink">
            Run Club <span className="text-accent">Maps</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-concrete">
            La carte communautaire des clubs de course à pied en France.
            Un projet collaboratif pour aider chaque coureur à trouver sa
            communauté, où qu'il soit.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">Liens rapides</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="#carte" className="text-ink/80 transition-colors hover:text-accent">
                Voir la carte
              </a>
            </li>
            <li>
              <button
                type="button"
                onClick={onOpenSuggest}
                className="text-ink/80 transition-colors hover:text-accent"
              >
                Proposer un club
              </button>
            </li>
            <li>
              <a
                href="https://www.instagram.com/sport_club_explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink/80 transition-colors hover:text-accent"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">Rejoins la communauté</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink/80">
            Un club n'est pas encore sur la carte ? Signale-le nous en deux
            minutes, il sera ajouté après vérification.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-ink-line pt-6 text-xs text-concrete sm:flex-row">
        <p>© {new Date().getFullYear()} Run Club Maps. Fait avec ❤️ pour la communauté running.</p>
        <p>Données cartographiques © OpenStreetMap &amp; CARTO</p>
      </div>
    </footer>
  );
}
