import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export function useUserRole() {
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const r = user.user_metadata?.role === 'admin' ? 'admin' : 'user';
        setRole(r);
        setUser(user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setRole(u.user_metadata?.role === 'admin' ? 'admin' : 'user');
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { role, user, loading, isAdmin: role === 'admin' };
}
