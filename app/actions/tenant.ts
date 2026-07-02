"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
 * Server Action untuk membuat organisasi/tenant baru (Proses Onboarding)
 */
export async function createTenant(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User tidak terautentikasi. Silakan login kembali." };
  }

  const name = formData.get("name") as string;
  if (!name || name.trim().length < 2) {
    return { error: "Nama organisasi minimal harus memiliki 2 karakter." };
  }

  // 1. Generate URL-friendly slug dari nama organisasi
  let slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Ganti semua karakter non-alfanumerik dengan strip (-)
    .replace(/(^-|-$)+/g, ""); // Bersihkan strip di awal dan akhir

  // 2. Validasi keunikan slug di database
  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existingTenant) {
    // Jika slug sudah dipakai oleh organisasi lain, tambahkan suffix acak agar unik
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${suffix}`;
  }

  // 3. Masukkan data ke tabel public.tenants
  const { data: newTenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: name.trim(),
      slug: slug
    })
    .select()
    .single();

  if (tenantError || !newTenant) {
    return { error: tenantError?.message || "Gagal mendaftarkan organisasi baru." };
  }

  // 4. Hubungkan user dengan tenant baru ini di tabel public.memberships sebagai OWNER
  const { error: membershipError } = await supabase.from("memberships").insert({
    user_id: user.id,
    tenant_id: newTenant.id,
    role: "Owner" // Pengbuat otomatis menjadi Owner
  });

  if (membershipError) {
    return { error: membershipError.message || "Gagal membuat akses membership." };
  }

  // 5. Simpan ID organisasi baru ke Cookie sebagai organisasi aktif saat ini
  const cookieStore = await cookies();
  cookieStore.set("active_tenant_id", newTenant.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  // 6. Alihkan pengguna langsung ke dashboard tim barunya
  redirect(`/${newTenant.slug}/dashboard`);
}
