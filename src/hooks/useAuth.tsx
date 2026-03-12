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

const ROLE_PRIORITY: AppRole[] = ['admin_fabrica', 'franquia'];

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
  const lastSyncedUserRef = useRef<string | null>(null);
  const metaResolvedUserRef = useRef<string | null>(null);

  const fetchUserMeta = useCallback(async (userId: string) => {
    const [{ data: rolesData, error: rolesError }, { data: profileData, error: profileError }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('franquia_id').eq('user_id', userId).maybeSingle(),
    ]);

    if (rolesError) { /* role fetch failed silently */ }
    if (profileError) { /* profile fetch failed silently */ }

    const roles = (rolesData ?? []).map(item => item.role);
    const primaryRole = resolvePrimaryRole(roles);
    const franchId = profileData?.franquia_id ?? null;

    // Check if franchise is active (only for franchise users)
    if (primaryRole === 'franquia' && franchId) {
      const { data: franchData } = await supabase
        .from('franchises')
        .select('ativa')
        .eq('id', franchId)
        .maybeSingle();
      if (franchData && !franchData.ativa) {
        return { role: null, franchiseId: null, inactive: true };
      }
    }

    return {
      role: primaryRole,
      franchiseId: franchId,
      inactive: false,
    };
  }, []);

  const syncSession = useCallback(async (currentUser: User | null, lockId: string) => {
    if (!mountedRef.current) return;

    syncLockRef.current = lockId;

    if (!currentUser) {
      if (syncLockRef.current !== lockId || !mountedRef.current) return;
      lastSyncedUserRef.current = null;
      metaResolvedUserRef.current = null;
      setUser(null);
      setRole(null);
      setFranchiseId(null);
      setLoading(false);
      return;
    }

    // Skip duplicate sync only after metadata for this user has already been resolved once.
    if (
      lastSyncedUserRef.current === currentUser.id &&
      lockId !== 'signin-force' &&
      metaResolvedUserRef.current === currentUser.id
    ) {
      setLoading(false);
      return;
    }

    setUser(currentUser);
    lastSyncedUserRef.current = currentUser.id;

    try {
      const meta = await fetchUserMeta(currentUser.id);
      if (!mountedRef.current) return;

      if (meta.inactive) {
        await supabase.auth.signOut();
        return;
      }

      setRole(meta.role);
      setFranchiseId(meta.franchiseId);
      metaResolvedUserRef.current = currentUser.id;
    } catch (_err) {
      if (!mountedRef.current) return;
      setRole(null);
      setFranchiseId(null);
      metaResolvedUserRef.current = currentUser.id;
    }

    if (mountedRef.current) {
      setLoading(false);
    }
  }, [fetchUserMeta]);

  useEffect(() => {
    mountedRef.current = true;

    // Listen first to avoid missing auth events between mount and initial session read.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = crypto.randomUUID();
      syncSession(session?.user ?? null, id);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user ?? null, 'init');
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
      lastSyncedUserRef.current = null; // Force re-fetch on explicit sign-in
      const lockId = 'signin-force';
      await syncSession(data.user, lockId);
    }

    return { error: null };
  }, [syncSession]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
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
