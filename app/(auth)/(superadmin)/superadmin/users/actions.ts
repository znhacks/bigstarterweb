// app/(auth)/(superadmin)/superadmin/users/actions.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { profileRepository } from "@/supabase/repositories/profiles";
import { getLocale } from "next-intl/server";
import { User } from "./view";

export async function getSuperadminUsers(): Promise<User[]> {
  const cookieStore = await cookies();
  const locale = await getLocale();

  // Inisialisasi client standar jika diperlukan untuk validasi sesi/cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        }
      }
    }
  );

  // Ambil data profil lengkap sesuai skema tabel profiles
  const { data: profiles, error } = await (
    await profileRepository(supabaseAdmin)
  )
    .query()
    .select(
      `
      id,
      full_name,
      created_at,
      avatar,
      status,
      banned_until,
      banned_reason,
      is_superadmin,
      preferred_language,
      timezone,
      address_line1,
      address_line2,
      address_city,
      address_region,
      address_postal_code,
      address_country,
      description,
      phone,
      address_kecamatan,
      address_desa,
      currency
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat data profil server-side:", error.message);
    return [];
  }

  // Mengambil data kredensial (email & sign-in metadata) dari auth.users secara aman
  const authUserMap = new Map<string, { email: string | null; lastSignIn: string | null }>();
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (!authError && authData?.users) {
      authData.users.forEach((user) => {
        authUserMap.set(user.id, {
          email: user.email || null,
          lastSignIn: user.last_sign_in_at || null
        });
      });
    }
  } catch (err) {
    console.error("Gagal memuat data auth users:", err);
  }

  // Gabungkan data tabel profiles dan data auth.users
  const formattedUsers: User[] = (profiles || []).map((prof: any, index: number) => {
    const fullName = prof.full_name || "Unknown User";
    const authInfo = authUserMap.get(prof.id);
    const roleVal: "superadmin" | "user" = prof.is_superadmin ? "superadmin" : "user";

    return {
      id: index + 1,
      dbId: prof.id,
      name: fullName,
      role: roleVal,
      email: authInfo?.email || null,
      country: prof.address_country || "-",
      status: (prof.status as "active" | "banned" | "deleted") || "active",
      image:
        prof.avatar ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      created_at: prof.created_at,
      updated_at: prof.updated_at,
      lastSignIn: authInfo?.lastSignIn || null,
      accountStatus: (prof.status as User["accountStatus"]) || "active",
      bannedUntil: prof.banned_until || null,
      bannedReason: prof.banned_reason || null,

      // Detail data tambahan untuk view sheet
      description: prof.description || null,
      phone: prof.phone || null,
      address_line1: prof.address_line1 || null,
      address_line2: prof.address_line2 || null,
      address_desa: prof.address_desa || null,
      address_kecamatan: prof.address_kecamatan || null,
      address_city: prof.address_city || null,
      address_region: prof.address_region || null,
      address_postal_code: prof.address_postal_code || null,
      address_country: prof.address_country || null,
      preferred_language: prof.preferred_language || null,
      currency: prof.currency || null,
      timezone: prof.timezone || null,
      is_superadmin: !!prof.is_superadmin
    };
  });

  return formattedUsers;
}
