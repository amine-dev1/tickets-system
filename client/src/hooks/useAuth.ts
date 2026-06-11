import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Only the first auth event should drive the full-page loading spinner.
    // Later events (SIGNED_IN on tab refocus, etc.) refresh the profile silently.
    let resolvedInitial = false;

    // IMPORTANT: this callback is intentionally NOT async and must not call
    // other Supabase methods directly. The callback runs while Supabase holds
    // its internal auth lock (navigator.locks); calling supabase.from(...) /
    // getSession() in here would try to re-acquire that same lock and deadlock,
    // which is what left the app stuck on the loading spinner after switching
    // tabs. We defer all Supabase work to a macrotask so the lock is released
    // first. See https://github.com/supabase/auth-js (onAuthStateChange notes).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setSession(session);

      if (event === 'SIGNED_OUT') {
        resolvedInitial = true;
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Silent session refresh (e.g. on tab focus). Profile is already loaded;
        // nothing to do, and crucially don't toggle the loading state.
        return;
      }

      if (session?.user) {
        const showLoading = !resolvedInitial;
        resolvedInitial = true;
        // Defer out of the auth-lock callback to avoid a deadlock.
        setTimeout(() => fetchProfile(session.user.id, showLoading), 0);
      } else {
        resolvedInitial = true;
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, showLoading: boolean) {
    if (showLoading) setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, company:company_id (id, name, slug, logo_url)')
        .eq('id', userId)
        .single();
      setUser(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }
}
