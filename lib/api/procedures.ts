// lib/api/procedures.ts
//
// Procedure builder DX ala supastarter (di atas oRPC). Pakai `o.use(middleware)`
// utk menjamin auth/session ter-inject di context + ter-tipe.
//
//   publicProcedure    — tanpa auth (mis. katalog plans).
//   protectedProcedure — wajib auth (apikey ATAU dashboard session); context.auth.
//   sessionProcedure   — wajib DASHBOARD SESSION (apikey ditolak); context.session.
//   adminProcedure     — session + superadmin.
//
// Procedure mutasi tetap panggil `requirePermission(context, PERM)` utk cek RBAC per-aksi.

import { o, getAuth, getSession } from "./context";
import { forbidden } from "./errors";
import { profileRepository } from "@/supabase/repositories/profiles";
import { supabaseAdmin } from "./supabase-server";

/** Procedure publik (tanpa auth). */
export const publicProcedure = o;

/** Wajib auth (apikey atau dashboard session). Context mendapat `auth`. */
export const protectedProcedure = o.use(async ({ context, next }) => {
  const auth = getAuth(context);
  return next({ context: { auth } });
});

/** Wajib dashboard session (apikey ditolak). Context mendapat `session`. */
export const sessionProcedure = o.use(async ({ context, next }) => {
  const session = getSession(context);
  return next({ context: { session } });
});

/** Wajib superadmin (di atas session). */
export const adminProcedure = sessionProcedure.use(async ({ context, next }) => {
  const { data: profile } = await (await profileRepository(supabaseAdmin))
    .query()
    .select("is_superadmin")
    .eq("id", context.session.userId)
    .maybeSingle();
  if (!profile?.is_superadmin) {
    throw forbidden("Superadmin access required.");
  }
  return next({ context: {} });
});
