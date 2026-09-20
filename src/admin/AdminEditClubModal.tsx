import { useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AdminClub } from './types';

interface AdminEditClubModalProps {
  club: AdminClub;
  session: Session;
  onClose: () => void;
  onSaved: (club: AdminClub) => void;
}

type FieldKey = Exclude<keyof AdminClub, 'id' | 'status' | 'created_at'>;

const FIELDS: { key: FieldKey; label: string; type?: 'textarea' | 'number' }[] = [
  { key: 'name', label: 'Nom' },
  { key: 'city', label: 'Ville' },
  { key: 'frequency', label: 'Fréquence (FR)' },
  { key: 'frequency_en', label: 'Fréquence (EN)' },
  { key: 'description', label: 'Description (FR)', type: 'textarea' },
  { key: 'description_en', label: 'Description (EN)', type: 'textarea' },
  { key: 'image', label: 'URL du logo' },
  { key: 'latitude', label: 'Latitude', type: 'number' },
  { key: 'longitude', label: 'Longitude', type: 'number' },
  { key: 'website', label: 'Site web' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'strava', label: 'Strava' },
];

export default function AdminEditClubModal({ club, session, onClose, onSaved }: AdminEditClubModalProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, club[f.key] == null ? '' : String(club[f.key])])) as Record<
      FieldKey,
      string
    >
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: FieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
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
      const payload: Record<string, unknown> = { id: club.id };
      for (const field of FIELDS) {
        const raw = values[field.key].trim();
        payload[field.key] = raw === '' ? null : field.type === 'number' ? Number(raw) : raw;
      }

      const res = await fetch('/api/admin/clubs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la mise à jour.');
      onSaved(data.club as AdminClub);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-ink-line bg-paper shadow-[0_20px_60px_rgba(18,21,26,0.35)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-line px-6 py-4">
          <h2 className="font-display text-lg font-bold uppercase tracking-tight text-ink">Modifier le club</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-ink-line text-ink transition-colors hover:border-accent hover:text-accent"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-6 py-6">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-bold uppercase tracking-wide text-concrete" htmlFor={`field-${field.key}`}>
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={`field-${field.key}`}
                  value={values[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-ink-line px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              ) : (
                <input
                  id={`field-${field.key}`}
                  type={field.type === 'number' ? 'number' : 'text'}
                  step={field.type === 'number' ? 'any' : undefined}
                  value={values[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="mt-1 w-full rounded-md border border-ink-line px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-ink-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink-line px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
