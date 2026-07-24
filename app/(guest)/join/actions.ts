// app/(guest)/join/actions.ts
//
// Server Action untuk menerima / menolak undangan organisasi.
//
// Mengapa server-side: kebijakan RLS `memberships` INSERT adalah
// `is_tenant_admin(tenant_id)` — anggota biasa TIDAK dapat memasukkan
// membership-nya sendiri melalui klien browser. Accept harus lewat service-role
// SETELAH diverifikasi: token signature valid, belum kedaluwarsa, dan
// session.email === invitation.email (mencegah hijack undangan org lain).

"use server";

import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { verifyInviteToken } from "@/lib/invite/token";
import { invitationRepository } from "@/supabase/repositories/invitations";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { tenantRepository } from "@/supabase/repositories/tenants";

export type AcceptResult =
  | { ok: true; id: string; slug: string; already?: boolean }
  | { ok: false; code: "auth" | "invalid" | "email_mismatch" | "failed" };

export async function acceptInvitation(token: string): Promise<AcceptResult> {
  const user = await getUser();
  if (!user) return { ok: false, code: "auth" };

  const payload = verifyInviteToken(token);
  if (!payload) return { ok: false, code: "invalid" };

  // WAJIB: email sesi harus cocok dengan email undangan (inti dari anti-hijack).
  const sessionEmail = (user.email || "").trim().toLowerCase();
  if (!sessionEmail || sessionEmail !== payload.e.toLowerCase()) {
    return { ok: false, code: "email_mismatch" };
  }

  const invitations = await invitationRepository(supabaseAdmin);
  const { data: invite, error } = await invitations
    .query()
    .select("id, tenant_id, role_id, email")
    .eq("id", payload.i)
    .maybeSingle();
  if (error || !invite) return { ok: false, code: "invalid" };

  // Defense-in-depth: cocokkan email terhadap baris undangan juga.
  if ((invite.email || "").trim().toLowerCase() !== sessionEmail) {
    return { ok: false, code: "email_mismatch" };
  }

  const tenants = await tenantRepository(supabaseAdmin);
  const { data: tenant } = await tenants
    .query()
    .select("id, slug")
    .eq("id", invite.tenant_id)
    .maybeSingle();
  if (!tenant) return { ok: false, code: "invalid" };

  const memberships = await membershipRepository(supabaseAdmin);
  const { data: existing } = await memberships
    .query()
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", invite.tenant_id)
    .maybeSingle();

  if (existing) {
    // Sudah jadi anggota — tetap konsumsi undangan, lalu arahkan ke dashboard.
    await invitations.query().delete().eq("id", invite.id);
    return { ok: true, id: tenant.id, slug: tenant.slug, already: true };
  }

  // Insert membership via service-role (RLS melarang self-insert oleh member).
  const { error: insertErr } = await memberships.query().insert({
    user_id: user.id,
    tenant_id: invite.tenant_id,
    role_id: invite.role_id
  });
  if (insertErr) {
    console.error("[acceptInvitation] insert membership gagal:", insertErr.message);
    return { ok: false, code: "failed" };
  }

  // Konsumsi undangan (single-use).
  await invitations.query().delete().eq("id", invite.id);

  return { ok: true, id: tenant.id, slug: tenant.slug };
}

export type DeclineResult = { ok: boolean; code?: "auth" | "invalid" };

export async function declineInvitation(token: string): Promise<DeclineResult> {
  const user = await getUser();
  if (!user) return { ok: false, code: "auth" };

  const payload = verifyInviteToken(token);
  if (!payload) return { ok: false, code: "invalid" };

  // Hanya pemilik email undangan yang boleh menolak.
  const sessionEmail = (user.email || "").trim().toLowerCase();
  if (!sessionEmail || sessionEmail !== payload.e.toLowerCase()) {
    return { ok: false, code: "invalid" };
  }

  const invitations = await invitationRepository(supabaseAdmin);
  await invitations.query().delete().eq("id", payload.i);
  return { ok: true };
}
