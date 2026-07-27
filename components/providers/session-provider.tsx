"use client";

// Single source of truth sesi di client. Satu fetch + onAuthStateChange subscription;
// konsumsi via `useSession()`. Hilangkan puluhan `supabase.auth.getUser()` ad-hoc.

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState
} from "react";
import { supabase } from "@/lib/supabase";
import { profileRepository } from "@/supabase/repositories/profiles";
import type { AuthUser, AuthSession } from "@/lib/session";

interface SessionState {
  user: AuthUser | null;
  session: AuthSession | null;
  loaded: boolean;
  reloadSession: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setSession(null);
        return;
      }
      const profileRepo = await profileRepository(supabase);
      const { data: profile } = await profileRepo
        .query()
        .select("full_name, avatar, is_superadmin")
        .eq("id", session.user.id)
        .maybeSingle();
      const meta: any = session.user.user_metadata ?? {};
      setUser({
        id: session.user.id,
        email: session.user.email ?? "",
        emailVerified: !!session.user.email_confirmed_at,
        name: profile?.full_name ?? meta.full_name ?? meta.name ?? null,
        image: profile?.avatar ?? meta.avatar_url ?? meta.avatar ?? null,
        isSuperadmin: !!profile?.is_superadmin
      });
      setSession({
        userId: session.user.id,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        accessToken: session.access_token
      });
    } catch {
      setUser(null);
      setSession(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return (
    <SessionContext.Provider value={{ user, session, loaded, reloadSession: load }}>
      {children}
    </SessionContext.Provider>
  );
}

/** Hook sesi client. Harus dipakai di dalam <SessionProvider>. */
export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession harus dipakai di dalam <SessionProvider>.");
  }
  return ctx;
}
