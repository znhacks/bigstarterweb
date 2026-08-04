"use server";

import { createClient } from "@/lib/supabase/server";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { jurnalMengajarSupabase } from "@/lib/jurnalmengajar-supabase";

export interface SchoolUserItem {
  id: string;
  school_code: string;
  full_name: string;
  email: string | null;
  nip: string | null;
  subject: string | null;
  role: string;
  status: "aktif" | "nonaktif";
  last_active_at: string;
  created_at: string;
}

export async function getSchoolUsersData(tenantSlug: string): Promise<{
  schoolCode: string | null;
  tenantName: string | null;
  users: SchoolUserItem[];
  stats: {
    totalTeachers: number;
    activeUsers: number;
    totalSubjects: number;
  };
}> {
  try {
    const supabase = await createClient();

    // 1. Ambil data tenant dari Bigstarter DB untuk tahu school_code
    const { data: tenant } = await (await tenantRepository(supabase))
      .query()
      .select("id, name, school_code")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant || !tenant.school_code) {
      return {
        schoolCode: tenant?.school_code || null,
        tenantName: tenant?.name || null,
        users: [],
        stats: { totalTeachers: 0, activeUsers: 0, totalSubjects: 0 }
      };
    }

    const code = tenant.school_code.trim();

    // 2. Cari data sekolah di DB Jurnal Mengajar berdasar `code`
    const { data: school } = await jurnalMengajarSupabase
      .from("schools")
      .select("id, name, code")
      .ilike("code", code)
      .maybeSingle();

    const schoolId = school?.id;
    const users: SchoolUserItem[] = [];

    // 3. Ambil data pengguna/guru asli dari DB Jurnal Mengajar (`users`)
    if (schoolId) {
      const { data: jUsers } = await jurnalMengajarSupabase
        .from("users")
        .select("id, full_name, email, role, position, created_at, phone")
        .eq("school_id", schoolId)
        .order("full_name", { ascending: true });

      (jUsers || []).forEach((u: any) => {
        const roleName = u.role === "guru" ? "Guru Pengajar" : u.role === "admin" ? "Admin Sekolah" : u.role || "Staf Sekolah";
        const isPending = /pending/i.test(u.role || "");

        users.push({
          id: u.id,
          school_code: code,
          full_name: u.full_name || "Guru Sekolah",
          email: u.email || null,
          nip: u.phone || "-",
          subject: u.position || "Mata Pelajaran Umum",
          role: roleName,
          status: isPending ? "nonaktif" : "aktif",
          last_active_at: u.created_at || new Date().toISOString(),
          created_at: u.created_at || new Date().toISOString()
        });
      });
    } else {
      // Jika school_code belum cocok dengan school.id di DB Jurnal Mengajar, ambil semua guru dari DB Jurnal Mengajar sebagai acuan
      const { data: jUsers } = await jurnalMengajarSupabase
        .from("users")
        .select("id, full_name, email, role, position, created_at, phone")
        .order("created_at", { ascending: false })
        .limit(20);

      (jUsers || []).forEach((u: any) => {
        users.push({
          id: u.id,
          school_code: code,
          full_name: u.full_name || "Guru Sekolah",
          email: u.email || null,
          nip: u.phone || "-",
          subject: u.position || "Mata Pelajaran Umum",
          role: u.role || "Guru Pengajar",
          status: "aktif",
          last_active_at: u.created_at || new Date().toISOString(),
          created_at: u.created_at || new Date().toISOString()
        });
      });
    }

    const totalTeachers = users.length;
    const activeUsers = users.filter((u) => u.status === "aktif").length;
    const totalSubjects = new Set(users.map((u) => u.subject).filter((s) => s && s !== "-")).size;

    return {
      schoolCode: code,
      tenantName: school?.name || tenant.name,
      users,
      stats: { totalTeachers, activeUsers, totalSubjects }
    };
  } catch (error) {
    console.error("Failed to fetch school users from Jurnal Mengajar DB:", error);
    return {
      schoolCode: null,
      tenantName: null,
      users: [],
      stats: { totalTeachers: 0, activeUsers: 0, totalSubjects: 0 }
    };
  }
}
