import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
}

interface SuggestClubModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 Mo, doit rester cohérent avec api/submit-club

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SuggestClubModal({ open, onClose }: SuggestClubModalProps) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [frequency, setFrequency] = useState('');
  const [description, setDescription] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [strava, setStrava] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState(''); // honeypot

  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressDebounceRef = useRef<number | null>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Réinitialise le formulaire à chaque ouverture, pour ne pas garder les
  // données d'une soumission précédente.
  useEffect(() => {
    if (!open) return;
    setName('');
    setCity('');
    setFrequency('');
    setDescription('');
    setInstagram('');
    setFacebook('');
    setWebsite('');
    setTiktok('');
    setWhatsapp('');
    setStrava('');
    setCompanyWebsite('');
    setAddressQuery('');
    setAddressSuggestions([]);
    setSelectedCoords(null);
    setImageDataUrl(null);
    setImageError(null);
    setStatus('idle');
    setErrorMessage(null);
  }, [open]);

  // Recherche d'adresse "as you type", avec un léger délai pour éviter une
  // requête à chaque frappe.
  useEffect(() => {
    if (addressDebounceRef.current) window.clearTimeout(addressDebounceRef.current);

    if (addressQuery.trim().length < 3 || selectedCoords) {
      setAddressSuggestions([]);
      return;
    }

    addressDebounceRef.current = window.setTimeout(async () => {
      setAddressLoading(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(addressQuery)}`);
        const data = await response.json();
        setAddressSuggestions(data.suggestions || []);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 400);

    return () => {
      if (addressDebounceRef.current) window.clearTimeout(addressDebounceRef.current);
    };
  }, [addressQuery, selectedCoords]);

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setAddressQuery(suggestion.displayName);
    setSelectedCoords({ lat: suggestion.latitude, lng: suggestion.longitude });
    setAddressSuggestions([]);
    if (!city && suggestion.city) setCity(suggestion.city);
  };

  const handleAddressChange = (value: string) => {
    setAddressQuery(value);
    // Toute modification manuelle invalide la sélection précédente : on ne
    // veut jamais soumettre des coordonnées qui ne correspondent plus au
    // texte affiché.
    setSelectedCoords(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setImageError('Le logo doit être un fichier PNG ou JPEG.');
      setImageDataUrl(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`Le fichier doit faire moins de ${MAX_IMAGE_BYTES / (1024 * 1024)} Mo.`);
      setImageDataUrl(null);
      return;
    }

    setImageError(null);
    setImageDataUrl(await readFileAsDataUrl(file));
  };

  const canSubmit =
    name.trim().length > 0 && selectedCoords !== null && imageDataUrl !== null && status !== 'submitting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedCoords) return;

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/submit-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          frequency: frequency.trim(),
          description: description.trim(),
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          instagram,
          facebook,
          website,
          tiktok,
          whatsapp,
          strava,
          imageBase64: imageDataUrl,
          companyWebsite,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur inconnue');

      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-ink-line bg-paper shadow-[0_20px_60px_rgba(18,21,26,0.3)]">
        <div className="flex items-center justify-between border-b border-ink-line px-5 py-4">
          <h2 className="m-0 font-display text-lg font-bold uppercase tracking-tight text-ink">
            Proposer un <span className="text-accent">club</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-line text-ink hover:bg-paper-soft"
          >
            ✕
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="text-4xl">🎉</span>
            <p className="m-0 font-display text-lg font-bold uppercase tracking-tight text-ink">
              Merci !
            </p>
            <p className="m-0 max-w-sm text-sm leading-relaxed text-concrete">
              Votre club a bien été envoyé. Il sera visible sur la carte après une rapide vérification.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-sm bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
            {/* Honeypot anti-spam : invisible et ignoré par un visiteur humain. */}
            <input
              type="text"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                Nom du club *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div className="relative">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                Adresse du point de rendez-vous *
              </label>
              <input
                type="text"
                required
                placeholder="Ex : Place de la République, Paris"
                value={addressQuery}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              {selectedCoords && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                  ✓ Adresse localisée
                </p>
              )}
              {!selectedCoords && addressLoading && (
                <p className="mt-1 text-[11px] text-concrete">Recherche...</p>
              )}
              {addressSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-sm border border-ink-line bg-paper shadow-lg">
                  {addressSuggestions.map((suggestion, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper-soft"
                      >
                        {suggestion.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                Ville (pour les filtres du site)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Auto-remplie depuis l'adresse, modifiable"
                className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                Fréquence des sorties
              </label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="Ex : Hebdomadaire - Mardi 19h"
                className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                Logo du club (PNG ou JPEG) *
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                required
                onChange={handleFileChange}
                className="w-full text-sm text-ink file:mr-3 file:rounded-sm file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wide file:text-ink"
              />
              {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Aperçu du logo"
                  className="mt-2 h-16 w-16 rounded-full border border-ink-line object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">Instagram</label>
                <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">Facebook</label>
                <input type="url" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">Site web</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">TikTok</label>
                <input type="url" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@..." className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">WhatsApp</label>
                <input type="url" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="https://chat.whatsapp.com/..." className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">Strava</label>
                <input type="url" value={strava} onChange={(e) => setStrava(e.target.value)} placeholder="https://strava.com/clubs/..." className="w-full rounded-sm border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
              </div>
            </div>

            {status === 'error' && errorMessage && (
              <p className="rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-1 rounded-sm bg-accent px-5 py-3 text-sm font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'submitting' ? 'Envoi en cours...' : 'Envoyer ma proposition'}
            </button>
            <p className="m-0 text-center text-[11px] text-concrete">
              Votre club sera vérifié avant d'apparaître sur la carte publique.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
