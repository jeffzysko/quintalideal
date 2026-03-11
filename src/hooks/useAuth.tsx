import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
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

  const fetchUserMeta = async (userId: string) => {
    const [{ data: rolesData, error: rolesError }, { data: profileData, error: profileError }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('franquia_id').eq('user_id', userId).maybeSingle(),
    ]);

    if (rolesError) {
      console.error('Error loading user roles:', rolesError);
    }

    if (profileError) {
      console.error('Error loading user profile:', profileError);
    }

    const roles = (rolesData ?? []).map(item => item.role);

    return {
      role: resolvePrimaryRole(roles),
      franchiseId: profileData?.franquia_id ?? null,
    };
  };

  useEffect(() => {
    let mounted = true;

    const syncSession = async (session: Session | null) => {
      if (!mounted) return;

      setLoading(true);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setFranchiseId(null);
        setLoading(false);
        return;
      }

      const userMeta = await fetchUserMeta(currentUser.id);
      if (!mounted) return;

      setRole(userMeta.role);
      setFranchiseId(userMeta.franchiseId);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void syncSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
    }

    return { error: error?.message || null };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, franchiseId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
