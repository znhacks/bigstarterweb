// lib/session.ts
//
// Tipe domain + helper sesi SERVER (DX layer ala supastarter) di atas raw Supabase Auth.
// Idiomatik & strongly-typed: `getServerSession()` -> { session, user } | null.

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileRepository } from "@/supabase/repositories/profiles";

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  isSuperadmin: boolean;
}

export interface AuthSession {
  userId: string;
  expiresAt: string | null;
  accessToken: string;
}

export interface ServerSession {
  session: AuthSession;
  user: AuthUser;
}

function mapUser(supabaseUser: any, profile: any): AuthUser {
  const meta = supabaseUser?.user_metadata ?? {};
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    emailVerified: !!supabaseUser.email_confirmed_at,
    name: profile?.full_name ?? meta.full_name ?? meta.name ?? null,
    image: profile?.avatar ?? meta.avatar_url ?? meta.avatar ?? null,
    isSuperadmin: !!profile?.is_superadmin
  };
}

/**
 * Ambil sesi server (Server Component / Route Handler / Server Action).
 * Mengembalikan { session, user } ter-tipe, atau null bila belum login.
 * Ter-cache per HTTP request menggunakan React cache().
 */
export const getServerSession = cache(async (): Promise<ServerSession | null> => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let activeUser = user;
  let accessToken = "";
  let expiresAt: string | null = null;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    activeUser = activeUser || session.user;
    accessToken = session.access_token;
    expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
  }

  if (!activeUser) return null;

  const profileRepo = await profileRepository(supabase);
  const { data: profile } = await profileRepo
    .query()
    .select("full_name, avatar, is_superadmin")
    .eq("id", activeUser.id)
    .maybeSingle();

  return {
    session: {
      userId: activeUser.id,
      expiresAt,
      accessToken
    },
    user: mapUser(activeUser, profile)
  };
});

/**
 * Sama seperti `getServerSession` tapi redirect ke `redirectTo` bila belum login.
 */
export async function requireServerSession(
  redirectTo: string = "/login"
): Promise<ServerSession> {
  const s = await getServerSession();
  if (!s) redirect(redirectTo);
  return s;
}
