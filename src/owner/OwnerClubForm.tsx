import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { OwnerClub } from './types';
import AddressAutocompleteField, { type AddressSuggestion } from '../components/AddressAutocompleteField';
import { getCompletionChecklist } from './completionChecklist';
import OwnerShareCard from './OwnerShareCard';

interface OwnerClubFormProps {
  club: OwnerClub;
  session: Session;
  onUpdated: (club: OwnerClub) => void;
}

type TextFieldKey =
  | 'name'
  | 'frequency'
  | 'frequency_en'
  | 'description'
  | 'description_en'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'whatsapp'
  | 'strava';

const TEXT_FIELDS: { key: TextFieldKey; label: string; type?: 'textarea' }[] = [
  { key: 'name', label: 'Nom du club' },
  { key: 'frequency', label: 'Fréquence (FR)' },
  { key: 'frequency_en', label: 'Fréquence (EN)' },
  { key: 'description', label: 'Description (FR)', type: 'textarea' },
  { key: 'description_en', label: 'Description (EN)', type: 'textarea' },
  { key: 'website', label: 'Site web' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'strava', label: 'Strava' },
];

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
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const checklist = getCompletionChecklist(club);
  const missingItems = checklist.filter((item) => !item.done);
  const [values, setValues] = useState<Record<TextFieldKey, string>>(() =>
    Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, club[f.key] == null ? '' : String(club[f.key])])) as Record<
      TextFieldKey,
      string
    >
  );
  const [newAddress, setNewAddress] = useState<AddressSuggestion | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (key: TextFieldKey, value: string) => {
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
      for (const field of TEXT_FIELDS) {
        const raw = values[field.key].trim();
        changes[field.key] = raw === '' ? null : raw;
      }
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

  return (
    <div className="overflow-hidden rounded-xl border border-ink-line bg-paper shadow-[0_4px_16px_rgba(18,21,26,0.04)]">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {club.image ? (
            <img src={club.image} alt={club.name} className="h-12 w-12 shrink-0 rounded-full border border-ink-line object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-line bg-paper-soft text-lg">
              🏃
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-display font-bold uppercase tracking-tight text-ink">{club.name}</p>
            <p className="text-xs text-concrete">{club.city || 'Ville non renseignée'}</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShareOpen((v) => !v);
              setExpanded(false);
            }}
            className="rounded-md border border-ink-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {shareOpen ? 'Fermer' : 'Partager'}
          </button>
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              setShareOpen(false);
            }}
            className="rounded-md border border-ink-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {expanded ? 'Fermer' : 'Modifier'}
          </button>
        </div>
      </div>

      {/* Checklist de complétion : une vraie action à faire, utile même sans
          trafic sur le site (contrairement aux compteurs ci-dessous).
          Toujours affichée, y compris à 100% (confirmation positive) — sinon
          rien ne distingue "fiche complète" de "composant absent". */}
      <div className="mx-5 mb-4 border-t border-ink-line pt-3">
        {missingItems.length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
            <span aria-hidden="true">✅</span> Fiche complète
          </p>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-concrete">
              Fiche complétée à {Math.round(((checklist.length - missingItems.length) / checklist.length) * 100)}%
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${((checklist.length - missingItems.length) / checklist.length) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingItems.map((item) => (
                <span
                  key={item.key}
                  className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800"
                >
                  {item.label} manquant
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mini-stats cumulées, deux sources distinctes : les vues viennent de
          la carte (ouverture de la fiche d'un marqueur), les likes du mode
          swipe. Toujours visibles, même carte repliée — la vraie raison de
          revenir régulièrement. */}
      <div className="mx-5 mb-4 flex gap-4 border-t border-ink-line pt-3 text-xs text-concrete">
        <span className="flex items-center gap-1.5" title="Ouvertures de la fiche du club sur la carte">
          <span aria-hidden="true">👁️</span>
          <strong className="font-stat text-sm text-ink">{club.view_count}</strong> vues carte
        </span>
        <span className="flex items-center gap-1.5" title="Likes reçus en mode swipe">
          <span aria-hidden="true">❤️</span>
          <strong className="font-stat text-sm text-ink">{club.like_count}</strong> likes swipe
        </span>
      </div>

      {shareOpen && <OwnerShareCard club={club} />}

      {club.pendingRequest && (
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span aria-hidden="true">⏳</span>
          Une modification est en attente de validation par l'équipe Run Club Maps.
        </div>
      )}

      {expanded && (
        <form onSubmit={handleSubmit} className="space-y-6 border-t border-ink-line px-5 py-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">Logo</h3>
            <div className="mt-2 flex items-center gap-4">
              <img
                src={imageDataUrl || club.image || undefined}
                alt=""
                className={`h-16 w-16 rounded-full border border-ink-line object-cover ${
                  imageDataUrl || club.image ? '' : 'invisible'
                }`}
              />
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="w-full text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wide file:text-ink"
                />
                {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">Adresse</h3>
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

          <div className="space-y-4">
            {TEXT_FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  className="mb-1 block text-xs font-bold uppercase tracking-wide text-concrete"
                  htmlFor={`owner-field-${club.id}-${field.key}`}
                >
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`owner-field-${club.id}-${field.key}`}
                    value={values[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                ) : (
                  <input
                    id={`owner-field-${club.id}-${field.key}`}
                    type="text"
                    value={values[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full rounded-md border border-ink-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                )}
              </div>
            ))}
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
  );
}
