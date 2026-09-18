import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseAuth } from './supabaseAuthClient';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!supabaseAuth) {
      setCheckingSession(false);
      return;
    }
    supabaseAuth.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabaseAuth.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabaseAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-center">
        <p className="max-w-sm text-sm text-concrete">
          Configuration manquante : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies pour activer
          la page admin.
        </p>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-concrete">
        Chargement…
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onSignedIn={setSession} />;
  }

  return <AdminDashboard session={session} onSignOut={() => void supabaseAuth?.auth.signOut()} />;
}
