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

  const totalViews = clubs.reduce((sum, c) => sum + c.view_count, 0);
  const totalLikes = clubs.reduce((sum, c) => sum + c.like_count, 0);

  return (
    <div className="min-h-screen bg-paper">
      {/* En-tête identique au site public (même hauteur, même style sticky) */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-ink-line bg-paper/90 px-4 backdrop-blur-md sm:px-6">
        <a
          href="/"
          className="shrink-0 font-display text-base font-bold uppercase tracking-tight text-ink sm:text-lg"
        >
          Run Club <span className="text-accent">Maps</span>
        </a>
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="hidden text-xs font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-ink sm:inline-block"
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

      {/* Section d'accueil façon Hero : même badge, même halo décoratif, même
          typographie que la page d'accueil — pour que /mon-club se sente
          comme une page du site, pas comme un panneau d'administration. */}
      <section className="relative overflow-hidden bg-paper px-4 pb-8 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[-10%] h-[300px] w-[300px] rounded-full bg-accent/10 blur-[110px]"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Espace partenaire
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:text-4xl">
            Gère ton <span className="text-accent">club</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-concrete">
            Mets à jour les infos affichées sur la carte, partage ta fiche, et garde un œil sur ce qui compte.
          </p>

          {!loading && clubs.length > 0 && (
            <div className="mx-auto mt-7 flex max-w-xs items-stretch justify-center divide-x divide-ink-line">
              <div className="flex flex-1 flex-col px-3">
                <span className="font-stat text-3xl leading-none text-ink">{clubs.length}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete">
                  club{clubs.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-1 flex-col px-3">
                <span className="font-stat text-3xl leading-none text-accent">{totalViews}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete">vues carte</span>
              </div>
              <div className="flex flex-1 flex-col px-3">
                <span className="font-stat text-3xl leading-none text-ink">{totalLikes}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-concrete">likes swipe</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {loading && <p className="text-sm text-concrete">Chargement…</p>}

        {!loading && clubs.length === 0 && !error && (
          <div className="rounded-2xl border border-ink-line bg-paper p-8 text-center shadow-[0_4px_16px_rgba(18,21,26,0.04)]">
            <span className="text-3xl" aria-hidden="true">🏃</span>
            <p className="mt-3 text-sm text-ink">
              Aucun club ne vous est encore attribué avec l'adresse <strong>{session.user.email}</strong>.
            </p>
            <p className="mt-2 text-sm text-concrete">Contactez-nous pour associer votre club à ce compte.</p>
          </div>
        )}

        <div className="space-y-4">
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
