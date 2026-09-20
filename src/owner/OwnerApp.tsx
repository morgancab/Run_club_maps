import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseAuth } from '../lib/supabaseAuthClient';
import OwnerLogin from './OwnerLogin';
import OwnerDashboard from './OwnerDashboard';

export default function OwnerApp() {
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
          l'espace club.
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
    return <OwnerLogin onSignedIn={setSession} />;
  }

  return <OwnerDashboard session={session} onSignOut={() => void supabaseAuth?.auth.signOut()} />;
}
