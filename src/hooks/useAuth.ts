import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';

interface AuthState {
  session: any | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: any) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    if (get().initialized) return;

    // Listen for auth changes FIRST
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session });

      if (session?.user) {
        // Fetch profile - use setTimeout to avoid deadlock with Supabase
        setTimeout(async () => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          set({ profile: data as Profile | null, loading: false });
        }, 0);
      } else {
        set({ profile: null, loading: false });
      }
    });

    // Then get current session
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, initialized: true });

    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ profile: data as Profile | null, loading: false });
    } else {
      set({ loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
