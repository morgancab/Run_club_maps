import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { OwnerClub } from './types';
import AddressAutocompleteField, { type AddressSuggestion } from '../components/AddressAutocompleteField';
import { getCompletionChecklist } from './completionChecklist';
import OwnerShareCard from './OwnerShareCard';
import OwnerEngagementChecklist from './OwnerEngagementChecklist';
import SocialIcon from '../components/SocialIcon';
import type { SocialNetwork } from '../utils/socialIcons';

interface OwnerClubFormProps {
  club: OwnerClub;
  session: Session;
  onUpdated: (club: OwnerClub) => void;
}

type SocialFieldKey = 'website' | 'instagram' | 'facebook' | 'tiktok' | 'whatsapp' | 'strava';

const SOCIAL_FIELDS: { key: SocialFieldKey; label: string; icon: SocialNetwork; placeholder: string }[] = [
  { key: 'website', label: 'Site web', icon: 'website', placeholder: 'https://...' },
  { key: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/...' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook', placeholder: 'https://facebook.com/...' },
  { key: 'strava', label: 'Strava', icon: 'strava', placeholder: 'https://strava.com/clubs/...' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', placeholder: 'https://chat.whatsapp.com/...' },
  { key: 'tiktok', label: 'TikTok', icon: 'tiktok', placeholder: 'https://tiktok.com/@...' },
];

type FieldKey = SocialFieldKey | 'name' | 'frequency' | 'frequency_en' | 'description' | 'description_en';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 Mo, doit rester cohérent avec lib/imageUpload

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function OwnerClubForm({ club, session, onUpdated }: OwnerClubFormProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'infos' | 'share'>('infos');
  const [textLang, setTextLang] = useState<'fr' | 'en'>('fr');

  const checklist = getCompletionChecklist(club);
  const missingItems = checklist.filter((item) => !item.done);
  const completionPct = Math.round(((checklist.length - missingItems.length) / checklist.length) * 100);

  const [values, setValues] = useState<Record<FieldKey, string>>(() => {
    const keys: FieldKey[] = ['name', 'frequency', 'frequency_en', 'description', 'description_en', ...SOCIAL_FIELDS.map((f) => f.key)];
    return Object.fromEntries(keys.map((k) => [k, club[k] == null ? '' : String(club[k])])) as Record<FieldKey, string>;
  });
  const [newAddress, setNewAddress] = useState<AddressSuggestion | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (key: FieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setImageError('Le logo doit être un fichier PNG ou JPEG.');
      setImageDataUrl(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`Le logo doit faire moins de ${MAX_IMAGE_BYTES / (1024 * 1024)} Mo.`);
      setImageDataUrl(null);
      return;
    }

    setImageError(null);
    setImageDataUrl(await readFileAsDataUrl(file));
    setSuccess(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Le nom du club est requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const changes: Record<string, unknown> = {};
      (Object.keys(values) as FieldKey[]).forEach((key) => {
        const raw = values[key].trim();
        changes[key] = raw === '' ? null : raw;
      });
      if (newAddress) {
        changes['city'] = newAddress.city || null;
        changes['latitude'] = newAddress.latitude;
        changes['longitude'] = newAddress.longitude;
      }

      const res = await fetch('/api/owner/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ club_id: club.id, changes, imageBase64: imageDataUrl ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi.");
      setSuccess(true);
      setNewAddress(null);
      setImageDataUrl(null);
      onUpdated({ ...club, pendingRequest: data.request });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setSaving(false);
    }
  };

  // Anneau de progression autour du logo : une confirmation visuelle rapide
  // de la complétion de la fiche, sans avoir besoin d'ouvrir la carte.
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-line bg-paper shadow-[0_4px_16px_rgba(18,21,26,0.04)]">
      {/* Bannière photo, façon carte du mode swipe : la fiche du club vue
          comme elle apparaît sur le site, pas comme une ligne de tableau.
          La plupart des logos de clubs sont carrés/ronds (pas des photos
          panoramiques) : un simple object-cover les recadrait et coupait le
          texte du logo. On garde un fond flouté agrandi pour l'effet
          "bannière", et le logo entier par-dessus, jamais rogné. */}
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative block h-36 w-full overflow-hidden sm:h-44">
        {club.image ? (
          <>
            <img
              src={club.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl"
            />
            <div className="absolute inset-0 flex items-center justify-center p-5">
              <img
                src={club.image}
                alt={club.name}
                className="max-h-full max-w-[55%] rounded-md object-contain shadow-[0_8px_24px_rgba(18,21,26,0.35)]"
              />
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-paper-soft text-4xl">
            🏃
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Anneau de complétion, en badge dans le coin — confirmation visuelle
            rapide sans avoir besoin d'ouvrir la carte. */}
        <div className="absolute right-3 top-3 h-9 w-9">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r={ringRadius} fill="rgba(19,22,26,0.35)" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" />
            <circle
              cx="18"
              cy="18"
              r={ringRadius}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference * (1 - completionPct / 100)}
              style={{ transition: 'stroke-dashoffset 300ms ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
            {completionPct}%
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3">
          <div className="min-w-0 text-left">
            <p className="truncate font-display text-lg font-bold uppercase tracking-tight text-white">{club.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-white/85">
              <span>{club.city || 'Ville non renseignée'}</span>
              <span aria-hidden="true">·</span>
              <span title="Ouvertures de la fiche du club sur la carte">👁️ {club.view_count}</span>
              <span title="Likes reçus en mode swipe">❤️ {club.like_count}</span>
            </p>
          </div>
          <svg
            viewBox="0 0 24 24"
            className={`h-6 w-6 shrink-0 text-white transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {club.pendingRequest && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span aria-hidden="true">⏳</span>
          Une modification est en attente de validation par l'équipe Run Club Maps.
        </div>
      )}

      <OwnerEngagementChecklist
        missingLabels={missingItems.map((item) => item.label)}
        viewCount={club.view_count}
        shareCount={club.share_count}
      />

      {open && (
        <div className="border-t border-ink-line">
          <div className="flex gap-2 px-5 pt-4">
            <button
              type="button"
              onClick={() => setTab('infos')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === 'infos' ? 'bg-accent text-ink' : 'border border-ink-line text-concrete hover:border-accent hover:text-ink'
              }`}
            >
              Informations
            </button>
            <button
              type="button"
              onClick={() => setTab('share')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === 'share' ? 'bg-accent text-ink' : 'border border-ink-line text-concrete hover:border-accent hover:text-ink'
              }`}
            >
              Partager
            </button>
          </div>

          {tab === 'share' ? (
            <div className="px-5 py-5">
              <OwnerShareCard club={club} onShared={() => onUpdated({ ...club, share_count: club.share_count + 1 })} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
              {/* Identité : nom + logo côte à côte, l'essentiel visuel de la fiche */}
              <div className="flex items-start gap-4 rounded-lg bg-paper-soft p-4">
                <div className="shrink-0">
                  <img
                    src={imageDataUrl || club.image || undefined}
                    alt=""
                    className={`h-16 w-16 rounded-full border border-ink-line object-cover ${
                      imageDataUrl || club.image ? '' : 'invisible'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete" htmlFor={`owner-name-${club.id}`}>
                      Nom du club
                    </label>
                    <input
                      id={`owner-name-${club.id}`}
                      type="text"
                      value={values.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full rounded-md border border-ink-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">Logo</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleFileChange}
                      className="w-full text-xs text-ink file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:uppercase file:tracking-wide file:text-ink"
                    />
                    {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">📍 Adresse</h3>
                <p className="mt-1 text-sm text-ink">{club.city || 'Non renseignée'}</p>
                <div className="mt-2">
                  <AddressAutocompleteField
                    label="Nouvelle adresse (optionnel)"
                    placeholder="Rechercher une adresse pour la mettre à jour…"
                    helperText="Laissez vide pour ne pas changer la localisation du club."
                    onSelect={setNewAddress}
                  />
                </div>
              </div>

              {/* Fréquence + description, avec bascule FR/EN pour ne pas doubler
                  visuellement les champs. */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">📝 Détails</h3>
                  <div className="flex gap-1 rounded-md border border-ink-line p-0.5">
                    <button
                      type="button"
                      onClick={() => setTextLang('fr')}
                      className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase transition-colors ${
                        textLang === 'fr' ? 'bg-accent text-ink' : 'text-concrete'
                      }`}
                    >
                      FR
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextLang('en')}
                      className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase transition-colors ${
                        textLang === 'en' ? 'bg-accent text-ink' : 'text-concrete'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>
                <div className="mt-2 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                      Fréquence des sorties {textLang === 'en' && '(EN)'}
                    </label>
                    <input
                      type="text"
                      value={values[textLang === 'fr' ? 'frequency' : 'frequency_en']}
                      onChange={(e) => handleChange(textLang === 'fr' ? 'frequency' : 'frequency_en', e.target.value)}
                      placeholder="Ex : Hebdomadaire - Mardi 19h"
                      className="w-full rounded-md border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete">
                      Description {textLang === 'en' && '(EN)'}
                    </label>
                    <textarea
                      value={values[textLang === 'fr' ? 'description' : 'description_en']}
                      onChange={(e) => handleChange(textLang === 'fr' ? 'description' : 'description_en', e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-md border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Réseaux sociaux, avec le vrai logo de chaque plateforme */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">🌐 Réseaux sociaux</h3>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {SOCIAL_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2 rounded-md border border-ink-line bg-surface px-3 py-2">
                      <SocialIcon network={field.icon} className="h-4 w-4 shrink-0 text-concrete" />
                      <input
                        type="url"
                        value={values[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        aria-label={field.label}
                        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-concrete/60"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}
              {success && (
                <p className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
                  Modification envoyée pour validation.
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? 'Envoi…' : 'Envoyer pour validation'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
