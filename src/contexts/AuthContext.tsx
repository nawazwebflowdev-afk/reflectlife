import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 2000; // 2 seconds timeout for auth initialization

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let hasInitialized = false;

    const finishInit = (newSession: Session | null) => {
      if (isMounted && !hasInitialized) {
        hasInitialized = true;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        setInitialized(true);
        clearTimeout(timeoutId);
      }
    };

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && !hasInitialized) {
        console.warn('Auth initialization timed out, proceeding without session');
        finishInit(null);
      }
    }, AUTH_TIMEOUT_MS);

    // Set up auth state listener FIRST (critical order)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        // Only update if already initialized or this is the first call
        if (hasInitialized) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        } else {
          finishInit(newSession);
        }
      }
    });

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      finishInit(initialSession);
    }).catch((error) => {
      console.error('Error getting session:', error);
      finishInit(null);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear profile cache
      try {
        localStorage.removeItem('reflectlife_profile_cache');
      } catch {}
      
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      queryClient.clear();
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear state even if sign out fails
      setSession(null);
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, session, loading, initialized, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  // If something renders outside the provider (or during an unexpected mount order),
  // never leave the app stuck in an infinite "loading" state.
  if (context === undefined) {
    return {
      user: null,
      session: null,
      loading: false,
      initialized: true,
      signOut: async () => {},
    };
  }
  return context;
};
