// supabase/helper/kecamatan.ts
//
// Helper pengambilan data tabel `kecamatan` (schema public).
// Khusus Indonesia — turunan dari cities (kabupaten/kota).
// Kolom kunci: id_kab_kota (FK ke cities.id), nama_kecamatan.

import { getClient, type AnySupabaseClient } from "./client";
import { subdistrictRepository } from "@/supabase/repositories/sub-districts";

/** Ambil satu kecamatan berdasarkan id. */
export async function getKecamatanById(
  id: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await subdistrictRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil daftar kecamatan pada sebuah kabupaten/kota (id_kab_kota). */
export async function getKecamatanByKabupaten(
  kabKotaId: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await subdistrictRepository(supabase);
  return repo.query().select(select as "*").eq("id_kab_kota", kabKotaId);
}
