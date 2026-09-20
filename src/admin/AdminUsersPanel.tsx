import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

interface OwnerUser {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
  login_count: number;
  clubs: { name: string; city: string | null }[];
  editRequestCount: number;
}

interface AdminUsersPanelProps {
  session: Session;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminUsersPanel({ session }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement.');
        if (!cancelled) setUsers(data.users);
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

  if (loading) return <p className="mt-6 text-sm text-concrete">Chargement…</p>;

  return (
    <div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && users.length === 0 && !error && (
        <p className="mt-6 text-sm text-concrete">Aucun compte owner créé pour le moment.</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-ink-line">
        {users.length > 0 && (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line bg-paper-soft text-left text-xs font-bold uppercase tracking-wide text-concrete">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Inscrit le</th>
                <th className="px-3 py-2">Dernière connexion</th>
                <th className="px-3 py-2 text-center">Connexions</th>
                <th className="px-3 py-2">Club(s) associé(s)</th>
                <th className="px-3 py-2 text-center">Modifs proposées</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-ink-line last:border-0">
                  <td className="px-3 py-2 text-ink">{user.email}</td>
                  <td className="px-3 py-2 text-concrete">{formatDate(user.created_at)}</td>
                  <td className="px-3 py-2 text-concrete">{formatDate(user.last_login_at)}</td>
                  <td className="px-3 py-2 text-center text-ink">{user.login_count}</td>
                  <td className="px-3 py-2 text-concrete">
                    {user.clubs.length > 0
                      ? user.clubs.map((c) => c.name).join(', ')
                      : <span className="italic">aucun</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-ink">{user.editRequestCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
