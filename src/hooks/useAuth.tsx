import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  role: string | null;
  franchiseId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

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
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    setRole(roleData?.role || null);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('franquia_id')
      .eq('user_id', userId)
      .single();
    setFranchiseId(profileData?.franquia_id || null);
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchUserMeta(currentUser.id);
        } else {
          setRole(null);
          setFranchiseId(null);
        }
        if (mounted) setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserMeta(currentUser.id);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setFranchiseId(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, franchiseId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
