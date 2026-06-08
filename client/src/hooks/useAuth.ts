import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, company:company_id (id, name, slug, logo_url)')
      .eq('id', userId)
      .single();
    setUser(data);
    setLoading(false);
  }
}
