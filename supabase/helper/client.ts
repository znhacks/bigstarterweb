// supabase/helper/client.ts
//
// Resolver client default untuk SEMUA helper di folder ini.
//
// DESAIN ISOMORPHIC (server & browser):
// Agar helper bisa diimpor dari Client Component, modul ini TIDAK boleh
// menyentuh `@/lib/supabase/server` (modul itu memakai `next/headers` →
// server-only; jika masuk grafik import helper, Next.js/Turbopack akan
// menariknya ke bundle browser dan build error). Karena itu client default
// di sini BUKAN server client.
//
// Konsekuensi pemakaian:
//   - Client Component : `await getProfile(user.id)` — no-arg, otomatis pakai
//                        browser `supabase` (@/lib/supabase). ✅
//   - Kode SERVER       : WAJIB teruskan client eksplisit pada argumen `client`:
//                        - user session : `await createClient()`        (@/lib/supabase/server)
//                        - service-role : `supabaseAdmin`              (@/lib/api/supabase-server)
//                                       / `systemClient`               (@/lib/supabase/manager)
//                        - tenant-scoped: `client` dari                (@/lib/supabase/tenant-server)
//                                       `createTenantServerClient()`   (WAJIB untuk tabel `tasks`)
//                        Contoh: `await getProfile(user.id, "*", await createClient())`
//   Bila dipanggil di server tanpa `client`, akan throw Error agar tidak
//   gagal diam-diam.

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tipe client yang menerima semua varian (SSR / service-role / tenant / browser).
 * Memakai `SupabaseClient` default (GenericSchema) — bukan `<any, any>` — supaya
 * `select` berupa `string` generik mengembalikan `data: any` (bukan
 * `GenericStringError`) dan chaining builder (.order/.limit/.eq) tetap utuh.
 * Nilai `SupabaseClient<any, any>` (systemClient/tenant) tetap assignable ke sini.
 */
export type AnySupabaseClient = SupabaseClient;

/**
 * Mengembalikan client Supabase: `client` jika diberikan; di browser memakai
 * browser `supabase` secara default. Di server TANPA `client` → throw.
 */
export async function getClient(
  client?: AnySupabaseClient
): Promise<AnySupabaseClient> {
  if (client) return client;

  if (typeof window !== "undefined") {
    const { supabase } = await import("@/lib/supabase");
    return supabase;
  }

  throw new Error(
    "[supabase/helper] Pemanggilan di server wajib meneruskan client eksplisit " +
      "(createClient() / supabaseAdmin / tenant client). " +
      "Contoh: getProfile(id, '*', await createClient())."
  );
}
