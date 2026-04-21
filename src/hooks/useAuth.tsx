import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { translateAuthError } from '@/lib/auth-errors';
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

const ROLE_PRIORITY: AppRole[] = ['super_admin', 'franquia'];

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
      supabase.from('profiles').select('franquia_id, blocked_at').eq('user_id', userId).maybeSingle(),
    ]);

    if (rolesError) { /* role fetch failed silently */ }
    if (profileError) { /* profile fetch failed silently */ }

    // Block users whose profile has been deactivated
    if (profileData?.blocked_at) {
      return { role: null, franchiseId: null, inactive: true, blocked: true };
    }

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
      if (!mountedRef.current || syncLockRef.current !== lockId) return;

      if (meta.inactive) {
        await supabase.auth.signOut({ scope: 'local' });
        if ((meta as { blocked?: boolean }).blocked && typeof window !== 'undefined' && window.location.pathname !== '/acesso-bloqueado') {
          window.location.replace('/acesso-bloqueado');
        }
        return;
      }

      // Users without a role cannot access any dashboard
      if (!meta.role) {
        console.warn('Auth: user has no assigned role, signing out:', currentUser.id);
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      setRole(meta.role);
      setFranchiseId(meta.franchiseId);
      metaResolvedUserRef.current = currentUser.id;

      // Track last access for franchise inactivity alerts
      if (meta.franchiseId && (meta.role === 'franquia' || meta.role === 'visualizador')) {
        supabase.from('franchises')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('id', meta.franchiseId)
          .then(() => {});
      }
    } catch (_err) {
      if (!mountedRef.current || syncLockRef.current !== lockId) return;
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
      return { error: translateAuthError(error.message) };
    }

    // Immediately sync session so role is available before navigation
    if (data.user) {
      lastSyncedUserRef.current = null; // Force re-fetch on explicit sign-in
      metaResolvedUserRef.current = null;
      const lockId = 'signin-force';
      await syncSession(data.user, lockId);

      // After sync, check if user was signed out (inactive franchise or no role)
      const { data: { session: postSyncSession } } = await supabase.auth.getSession();
      if (!postSyncSession) {
        setLoading(false);
        return { error: 'Sua conta não possui acesso ao painel. Entre em contato com o administrador.' };
      }
    }

    return { error: null };
  }, [syncSession]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_err) {
      // Force clear state even if signOut API fails
      setUser(null);
      setRole(null);
      setFranchiseId(null);
      lastSyncedUserRef.current = null;
      metaResolvedUserRef.current = null;
    } finally {
      setLoading(false);
    }
    // onAuthStateChange will also fire and clear state
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, franchiseId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
