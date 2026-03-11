import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Enums } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  role: string | null;
  franchiseId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

type AppRole = Enums<'app_role'>;

const ROLE_PRIORITY: AppRole[] = ['admin_fabrica', 'franquia', 'visualizador'];

const resolvePrimaryRole = (roles: AppRole[]): AppRole | null => {
  return ROLE_PRIORITY.find(role => roles.includes(role)) ?? roles[0] ?? null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  franchiseId: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const syncLockRef = useRef<string | null>(null);

  const fetchUserMeta = useCallback(async (userId: string) => {
    const [{ data: rolesData, error: rolesError }, { data: profileData, error: profileError }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('franquia_id').eq('user_id', userId).maybeSingle(),
    ]);

    if (rolesError) console.error('Error loading user roles:', rolesError);
    if (profileError) console.error('Error loading user profile:', profileError);

    const roles = (rolesData ?? []).map(item => item.role);
    return {
      role: resolvePrimaryRole(roles),
      franchiseId: profileData?.franquia_id ?? null,
    };
  }, []);

  const syncSession = useCallback(async (currentUser: User | null, lockId: string) => {
    if (!mountedRef.current) return;

    // Only the latest sync call should apply state
    syncLockRef.current = lockId;

    if (!currentUser) {
      if (syncLockRef.current !== lockId || !mountedRef.current) return;
      setUser(null);
      setRole(null);
      setFranchiseId(null);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    try {
      const meta = await fetchUserMeta(currentUser.id);
      if (syncLockRef.current !== lockId || !mountedRef.current) return;
      setRole(meta.role);
      setFranchiseId(meta.franchiseId);
    } catch (err) {
      console.error('Error syncing session:', err);
      if (syncLockRef.current !== lockId || !mountedRef.current) return;
      setRole(null);
      setFranchiseId(null);
    }

    if (syncLockRef.current === lockId && mountedRef.current) {
      setLoading(false);
    }
  }, [fetchUserMeta]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user ?? null, 'init');
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = crypto.randomUUID();
      syncSession(session?.user ?? null, id);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      return { error: error.message };
    }

    // Immediately sync session so role is available before navigation
    if (data.user) {
      const lockId = 'signin-' + Date.now();
      await syncSession(data.user, lockId);
    }

    return { error: null };
  }, [syncSession]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
    // onAuthStateChange will handle clearing state
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, franchiseId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
