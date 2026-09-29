import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { OwnerClub } from './types';
import { trackClubEvent } from '../utils/trackClubEvent';

interface OwnerShareCardProps {
  club: OwnerClub;
  /** Appelé après un clic sur "Copier" ou "Télécharger" — permet au parent de
   * mettre à jour share_count localement sans attendre un rechargement. */
  onShared: () => void;
}

// Lien + QR code vers la fiche du club, à usage de l'owner sur SES propres
// canaux (bio Instagram, affiche au point de rendez-vous...). Généré
// entièrement côté client (bibliothèque qrcode, pas d'API tierce) : after la
// mésaventure avec les tuiles CARTO qui ont fini par exiger une clé, on évite
// de dépendre d'un service externe pour quelque chose d'aussi simple.
export default function OwnerShareCard({ club, onShared }: OwnerShareCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/?club=${club.id}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(shareUrl, { width: 220, margin: 1, color: { dark: '#13161a', light: '#ffffff' } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      trackClubEvent(club.id, 'share');
      onShared();
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permission
      // refusée...) : le lien reste sélectionnable manuellement dans le champ.
    }
  };

  const handleDownload = () => {
    trackClubEvent(club.id, 'share');
    onShared();
  };

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">Partager mon club</h3>
      <p className="mt-1 text-xs leading-relaxed text-concrete">
        À coller dans ta bio Instagram, sur tes affiches ou ton site : ce lien ouvre directement la carte sur ton
        club.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-ink-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-ink-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>

      {qrDataUrl && (
        <div className="mt-4 flex items-center gap-4">
          <img src={qrDataUrl} alt="QR code vers la fiche du club" className="h-28 w-28 rounded-md border border-ink-line" />
          <div>
            <p className="text-xs leading-relaxed text-concrete">
              Un QR code à imprimer sur une affiche ou à partager tel quel.
            </p>
            <a
              href={qrDataUrl}
              download={`qr-code-${club.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
              onClick={handleDownload}
              className="mt-2 inline-block rounded-md bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5"
            >
              Télécharger le QR code
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
