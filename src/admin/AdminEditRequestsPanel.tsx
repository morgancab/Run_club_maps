import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

interface EditRequestClub {
  id: number;
  name: string;
  city: string | null;
  [key: string]: unknown;
}

interface EditRequest {
  id: number;
  club_id: number;
  changes: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  clubs: EditRequestClub | null;
}

interface AdminEditRequestsPanelProps {
  session: Session;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export default function AdminEditRequestsPanel({ session }: AdminEditRequestsPanelProps) {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/edit-requests?status=pending', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de chargement.');
      setRequests(data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: number, status: 'approved' | 'rejected') => {
    setActioningId(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/edit-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la mise à jour.');
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la mise à jour.');
    } finally {
      setActioningId(null);
    }
  };

  if (loading) return <p className="mt-6 text-sm text-concrete">Chargement…</p>;

  return (
    <div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {requests.length === 0 && !error && (
        <p className="mt-6 text-sm text-concrete">Aucune modification en attente.</p>
      )}

      <div className="mt-4 space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-md border border-ink-line bg-paper p-4">
            <p className="font-bold text-ink">
              {request.clubs?.name ?? `Club #${request.club_id}`}
              {request.clubs?.city ? ` · ${request.clubs.city}` : ''}
            </p>
            <p className="mt-1 text-xs text-concrete">
              Proposé le {new Date(request.created_at).toLocaleDateString('fr-FR')}
            </p>

            <div className="mt-3 space-y-1.5 rounded-md bg-paper-soft p-3">
              {Object.entries(request.changes)
                .filter(([key, value]) => (request.clubs?.[key] ?? null) !== (value ?? null))
                .map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-bold uppercase text-concrete">{key} :</span>{' '}
                    <span className="text-concrete line-through">{formatValue(request.clubs?.[key])}</span>{' '}
                    <span aria-hidden="true">→</span> <span className="text-ink">{formatValue(value)}</span>
                  </div>
                ))}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                disabled={actioningId === request.id}
                onClick={() => review(request.id, 'approved')}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink disabled:opacity-50"
              >
                Approuver
              </button>
              <button
                disabled={actioningId === request.id}
                onClick={() => review(request.id, 'rejected')}
                className="rounded-md border border-ink-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent disabled:opacity-50"
              >
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
