// supabase/helper/desa.ts
//
// Helper pengambilan data tabel `desa` (schema public).
// Desa / kelurahan (Indonesia) — turunan dari kecamatan.
// Kolom kunci: id_kecamatan (FK), nama_desa_kelurahan, kode_pos.

import { getClient, type AnySupabaseClient } from "./client";
import { villageRepository } from "@/supabase/repositories/villages";

/** Ambil satu desa/kelurahan berdasarkan id. */
export async function getDesaById(
  id: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await villageRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil daftar desa/kelurahan pada sebuah kecamatan. */
export async function getDesaByKecamatan(
  kecamatanId: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await villageRepository(supabase);
  return repo.query().select(select as "*").eq("id_kecamatan", kecamatanId);
}
