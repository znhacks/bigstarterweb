// app/actions/tenant.ts
"use server";

import { bigstarterConfig } from "@/bigstarter.config";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Inisialisasi Supabase Client khusus untuk skema 'system' (Bypass RLS dengan Service Role)
const systemSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: "public" },
    auth: { persistSession: false }
  }
);

/**
 * Server Action untuk mengganti tenant aktif saat ini melalui Cookie
 */
export async function switchTenant(tenantId: string, redirectTo: string = "/") {
  const cookieStore = await cookies();
  cookieStore.set("active_tenant_id", tenantId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });
  redirect(redirectTo);
}

/**
 * Server Action Tunggal untuk pendaftaran organisasi baru (Onboarding Multi-Model)
 */
export async function createTenant(formData: FormData) {
  // 1. Validasi Autentikasi Pengguna
  // Karena membutuhkan session user yang aktif, kita gunakan client auth default supabase
  const defaultSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user }
  } = await defaultSupabase.auth.getUser();
  if (!user) {
    return { error: "User tidak terautentikasi. Silakan login kembali." };
  }

  const name = formData.get("name") as string;
  if (!name || name.trim().length < 2) {
    return { error: "Nama organisasi minimal harus memiliki 2 karakter." };
  }

  // 2. Tentukan Model Database berdasarkan aturan konfigurasi
  const config = bigstarterConfig.database.multiTenancy;

  // Contoh logika: Default gratis adalah SHARED (Model 1), enterprise adalah ISOLATED (Model 2).
  // Anda bisa menyesuaikan input dari form jika ingin memberikan opsi paket kepada pengguna.
  const requestedPlan = formData.get("plan") as string; // 'FREE' | 'ENTERPRISE'
  let finalModel: "SHARED" | "ISOLATED" = requestedPlan === "ENTERPRISE" ? "ISOLATED" : "SHARED";

  if (config.forceModelGlobally) {
    finalModel = config.forceModelGlobally;
  } else {
    if (finalModel === "SHARED" && !config.allowModel1Shared) {
      return { error: "Registrasi Model 1 (Shared) sedang dinonaktifkan." };
    }
    if (finalModel === "ISOLATED" && !config.allowModel2Isolated) {
      return { error: "Registrasi Model 2 (Isolated) sedang dinonaktifkan." };
    }
  }

  // 3. Generate URL-friendly slug/subdomain unik dari nama organisasi
  let slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  // Validasi keunikan subdomain/slug di skema system
  const { data: existingTenant } = await systemSupabase
    .from("tenants")
    .select("subdomain")
    .eq("subdomain", slug)
    .maybeSingle();

  if (existingTenant) {
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${suffix}`;
  }

  // 4. Masukkan data ke tabel system.tenants
  const { data: newTenant, error: tenantError } = await systemSupabase
    .from("tenants")
    .insert({
      name: name.trim(),
      slug: slug, // slug digunakan sebagai subdomain pemisah
      db_model: finalModel
    })
    .select()
    .single();

  if (tenantError || !newTenant) {
    return { error: tenantError?.message || "Gagal mendaftarkan organisasi baru." };
  }

  // 5. Hubungkan user dengan tenant baru di tabel system.memberships sebagai OWNER
  const { error: membershipError } = await systemSupabase.from("memberships").insert({
    user_id: user.id,
    tenant_id: newTenant.id,
    role: "Owner"
  });

  if (membershipError) {
    return { error: membershipError.message || "Gagal membuat akses membership." };
  }

  // 6. JIKA MODEL 2: Jalankan prosedur otomatis pembuatan skema database di PostgreSQL
  if (finalModel === "ISOLATED") {
    const { error: rpcError } = await systemSupabase.rpc("create_new_tenant_schema", {
      tenant_subdomain: slug
    });

    if (rpcError) {
      return {
        error: `Tenant terdaftar, namun gagal menyiapkan ruang penyimpanan data: ${rpcError.message}`
      };
    }
  }

  // 7. Simpan ID organisasi ke Cookie aktif
  const cookieStore = await cookies();
  cookieStore.set("active_tenant_id", newTenant.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  // 8. Alihkan pengguna langsung ke dashboard tim barunya
  redirect(`/${newTenant.subdomain}/dashboard`);
}
