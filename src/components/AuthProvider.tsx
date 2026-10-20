import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, signOut as endSession, type Profile } from "@/lib/auth";

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);

  const syncSession = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next?.user) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    // Clear any previous error so the gate shows a loading state while the
    // profile is being fetched instead of a stale error screen.
    setProfileError(null);
    try {
      const nextProfile = await fetchProfile(next.user.id);
      if (!activeRef.current) return;
      setProfile(nextProfile);
      setProfileError(nextProfile ? null : "Akun ini belum memiliki peran. Hubungi Admin.");
    } catch {
      if (!activeRef.current) return;
      setProfile(null);
      setProfileError("Gagal memuat profil pengguna.");
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!activeRef.current) return;
      await syncSession(data.session);
      if (activeRef.current) setLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      void syncSession(next).finally(() => {
        if (activeRef.current) setLoading(false);
      });
    });

    return () => {
      activeRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, [syncSession]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await syncSession(data.session);
  }, [syncSession]);

  const signOut = useCallback(async () => {
    await endSession();
    queryClient.clear();
    setSession(null);
    setProfile(null);
    setProfileError(null);
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({ session, profile, loading, profileError, refreshProfile, signOut }),
    [session, profile, loading, profileError, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return value;
}
