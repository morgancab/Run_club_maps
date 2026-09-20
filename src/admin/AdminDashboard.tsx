import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AdminClub, StatusTab } from './types';
import AdminEditClubModal from './AdminEditClubModal';

const TAB_LABELS: Record<StatusTab, string> = {
  pending: 'En attente',
  approved: 'Approuvés',
  rejected: 'Rejetés',
};

interface AdminDashboardProps {
  session: Session;
  onSignOut: () => void;
}

export default function AdminDashboard({ session, onSignOut }: AdminDashboardProps) {
  const [tab, setTab] = useState<StatusTab>('pending');
  const [clubs, setClubs] = useState<AdminClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [editingClub, setEditingClub] = useState<AdminClub | null>(null);

  const load = useCallback(
    async (statusTab: StatusTab) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/clubs?status=${statusTab}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 403) {
          setUnauthorized(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement.');
        setClubs(data.clubs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    },
    [session.access_token]
  );

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const updateStatus = async (id: number, status: StatusTab) => {
    setActioningId(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/clubs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la mise à jour.');
      setClubs((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la mise à jour.');
    } finally {
      setActioningId(null);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Supprimer définitivement cette demande ? Cette action est irréversible.')) return;
    setActioningId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clubs?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la suppression.');
      setClubs((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la suppression.');
    } finally {
      setActioningId(null);
    }
  };

  if (unauthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper p-6 text-center">
        <p className="text-sm text-concrete">Ce compte n'est pas autorisé à accéder à l'administration.</p>
        <button onClick={onSignOut} className="text-xs font-bold uppercase tracking-wide text-accent">
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-soft">
      <header className="flex items-center justify-between border-b border-ink-line bg-paper px-6 py-4">
        <div>
          <h1 className="font-display text-lg font-bold uppercase tracking-tight text-ink">Administration</h1>
          <p className="text-xs text-concrete">{session.user.email}</p>
        </div>
        <button
          onClick={onSignOut}
          className="rounded-md border border-ink-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Se déconnecter
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="flex gap-2 border-b border-ink-line">
          {(Object.keys(TAB_LABELS) as StatusTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === t ? 'border-b-2 border-accent text-ink' : 'text-concrete hover:text-ink'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-6 text-sm text-concrete">Chargement…</p>}
        {!loading && clubs.length === 0 && (
          <p className="mt-6 text-sm text-concrete">Aucun club dans cette catégorie.</p>
        )}

        <div className="mt-4 space-y-3">
          {clubs.map((club) => (
            <div key={club.id} className="flex flex-col gap-4 rounded-md border border-ink-line bg-paper p-4 sm:flex-row">
              {club.image && (
                <img src={club.image} alt={club.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{club.name}</p>
                <p className="text-sm text-concrete">
                  {club.city || '—'} · {club.frequency || '—'}
                </p>
                {club.description && <p className="mt-1 line-clamp-2 text-sm text-concrete">{club.description}</p>}
                <p className="mt-1 text-xs text-concrete">
                  Proposé le {new Date(club.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col">
                {tab !== 'approved' && (
                  <button
                    disabled={actioningId === club.id}
                    onClick={() => updateStatus(club.id, 'approved')}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-50"
                  >
                    Approuver
                  </button>
                )}
                {tab !== 'rejected' && (
                  <button
                    disabled={actioningId === club.id}
                    onClick={() => updateStatus(club.id, 'rejected')}
                    className="rounded-md border border-ink-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                )}
                {tab !== 'pending' && (
                  <button
                    disabled={actioningId === club.id}
                    onClick={() => updateStatus(club.id, 'pending')}
                    className="rounded-md border border-ink-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-concrete transition-colors hover:border-accent disabled:opacity-50"
                  >
                    Remettre en attente
                  </button>
                )}
                <button
                  disabled={actioningId === club.id}
                  onClick={() => setEditingClub(club)}
                  className="rounded-md border border-ink-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent disabled:opacity-50"
                >
                  Modifier
                </button>
                <button
                  disabled={actioningId === club.id}
                  onClick={() => remove(club.id)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 transition-colors hover:border-red-400 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingClub && (
        <AdminEditClubModal
          club={editingClub}
          session={session}
          onClose={() => setEditingClub(null)}
          onSaved={(updated) => {
            setClubs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setEditingClub(null);
          }}
        />
      )}
    </div>
  );
}
