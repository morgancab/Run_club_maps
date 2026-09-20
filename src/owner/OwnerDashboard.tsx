import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { OwnerClub } from './types';
import OwnerClubForm from './OwnerClubForm';

interface OwnerDashboardProps {
  session: Session;
  onSignOut: () => void;
}

export default function OwnerDashboard({ session, onSignOut }: OwnerDashboardProps) {
  const [clubs, setClubs] = useState<OwnerClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/owner/clubs', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement.');
        if (!cancelled) setClubs(data.clubs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token]);

  return (
    <div className="min-h-screen bg-paper-soft">
      <header className="flex items-center justify-between border-b border-ink-line bg-paper px-6 py-4">
        <div>
          <a
            href="/"
            className="font-display text-base font-bold uppercase tracking-tight text-ink transition-colors hover:text-accent"
          >
            Run Club <span className="text-accent">Maps</span>
          </a>
          <p className="text-xs text-concrete">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-xs font-bold uppercase tracking-wide text-concrete transition-colors hover:text-ink"
          >
            ← Retour au site
          </a>
          <button
            onClick={onSignOut}
            className="rounded-md border border-ink-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display text-xl font-bold uppercase tracking-tight text-ink">Mes clubs</h1>
        <p className="mt-1 text-sm text-concrete">Les modifications sont revues par notre équipe avant publication.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-4 text-sm text-concrete">Chargement…</p>}

        {!loading && clubs.length === 0 && !error && (
          <div className="mt-6 rounded-xl border border-ink-line bg-paper p-8 text-center">
            <span className="text-3xl" aria-hidden="true">🏃</span>
            <p className="mt-3 text-sm text-ink">
              Aucun club ne vous est encore attribué avec l'adresse <strong>{session.user.email}</strong>.
            </p>
            <p className="mt-2 text-sm text-concrete">
              Contactez-nous pour associer votre club à ce compte.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {clubs.map((club) => (
            <OwnerClubForm
              key={club.id}
              club={club}
              session={session}
              onUpdated={(updated) => setClubs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
