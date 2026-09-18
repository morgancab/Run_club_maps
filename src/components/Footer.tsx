import type { Language } from '../RunClubMap'
import { translations } from '../i18n'

interface FooterProps {
  language: Language
  onOpenSuggest: () => void
}

export default function Footer({ language, onOpenSuggest }: FooterProps) {
  const t = translations[language]
  return (
    <footer className="border-t border-ink-line bg-paper px-4 py-12 sm:px-6 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-tight text-ink">
            Run Club <span className="text-accent">Maps</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-concrete">
            {t.footerTagline}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">{t.footerQuickLinks}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="#carte" className="text-ink/80 transition-colors hover:text-accent">
                {t.footerViewMap}
              </a>
            </li>
            <li>
              <button
                type="button"
                onClick={onOpenSuggest}
                className="text-ink/80 transition-colors hover:text-accent"
              >
                {t.navSuggest}
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
          <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">{t.footerJoinCommunity}</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink/80">
            {t.footerJoinText}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-ink-line pt-6 text-xs text-concrete sm:flex-row">
        <p>© {new Date().getFullYear()} Run Club Maps. {t.footerMade}</p>
        <p>{t.footerMapData}</p>
      </div>
    </footer>
  );
}
