// supabase/helper/invitations.ts
//
// Helper pengambilan data tabel `invitations` (schema public).

import { getClient, type AnySupabaseClient } from "./client";
import { invitationRepository } from "@/supabase/repositories/invitations";

/** Ambil satu invitation berdasarkan id. */
export async function getInvitation(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await invitationRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil semua invitation pada sebuah tenant. */
export async function getInvitationsByTenant(
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await invitationRepository(supabase);
  return repo.query().select(select as "*").eq("tenant_id", tenantId);
}

/** Ambil invitation berdasarkan email undangan. */
export async function getInvitationsByEmail(
  email: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await invitationRepository(supabase);
  return repo.query().select(select as "*").eq("email", email);
}

/** Ambil semua invitation yang menargetkan sebuah role. */
export async function getInvitationsByRole(
  roleId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await invitationRepository(supabase);
  return repo.query().select(select as "*").eq("role_id", roleId);
}

/** Hitung jumlah invitation pada sebuah role (pengecekan sebelum hapus role). */
export async function countInvitationsByRole(
  roleId: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await invitationRepository(supabase);
  return repo
    .query()
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);
}
