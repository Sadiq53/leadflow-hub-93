import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { checkUserRole } from "@/lib/auth";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  profile: { name: string; email: string } | null;
}

export const useAuth = (redirectOnUnauthenticated = true) => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
    profile: null,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (redirectOnUnauthenticated) {
          navigate("/auth");
        }
        setAuthState({
          user: null,
          session: null,
          isAdmin: false,
          loading: false,
          profile: null,
        });
        return;
      }

      const [adminStatus, profileData] = await Promise.all([
        checkUserRole(session.user.id),
        supabase
          .from('profiles')
          .select('name, email')
          .eq('id', session.user.id)
          .maybeSingle()
      ]);

      setAuthState({
        user: session.user,
        session,
        isAdmin: adminStatus,
        loading: false,
        profile: profileData.data,
      });
    } catch (error) {
      console.error('Auth error:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, [navigate, redirectOnUnauthenticated]);

  useEffect(() => {
    refreshAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            isAdmin: false,
            loading: false,
            profile: null,
          });
          if (redirectOnUnauthenticated) {
            navigate("/auth");
          }
        } else if (session) {
          refreshAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [refreshAuth, navigate, redirectOnUnauthenticated]);

  return authState;
};

export default useAuth;
