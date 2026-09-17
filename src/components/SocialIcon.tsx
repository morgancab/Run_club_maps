import { BRAND_PATHS, type SocialNetwork } from '../utils/socialIcons';

export type { SocialNetwork };

interface SocialIconProps {
  network: SocialNetwork;
  className?: string;
}

// Vrais logos des réseaux sociaux (tracés officiels, projet Simple Icons,
// licence CC0), rendus en `currentColor` pour s'adapter à la couleur de
// texte du bouton qui les contient. "website" n'est pas une marque : c'est
// une icône générique de lien/globe.
export default function SocialIcon({ network, className = 'h-full w-full' }: SocialIconProps) {
  if (network === 'website') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.4 2.6 3.6 5.7 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.7-3.6-9s1.2-6.4 3.6-9Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={BRAND_PATHS[network]} />
    </svg>
  );
}
