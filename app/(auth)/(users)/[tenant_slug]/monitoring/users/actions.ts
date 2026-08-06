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

    const schoolCodes = tenant.school_code
      .split(",")
      .map((c: string) => c.trim())
      .filter(Boolean);

    // 2. Cari data sekolah di DB Jurnal Mengajar berdasar `schoolCodes`
    const { data: schools } = await jurnalMengajarSupabase
      .from("schools")
      .select("id, name, code");

    const matchedSchools = (schools || []).filter((s: any) =>
      schoolCodes.some((code: string) => {
        const cLower = code.toLowerCase();
        return (
          (s.code && s.code.toLowerCase() === cLower) ||
          (s.id && s.id.toString().toLowerCase() === cLower) ||
          (s.npsn && s.npsn.toString().toLowerCase() === cLower) ||
          (s.name && s.name.toLowerCase().includes(cLower))
        );
      })
    );

    const schoolIds = matchedSchools.map((s: any) => s.id);
    const tenantNameDisplay = matchedSchools.map((s: any) => s.name).join(", ") || tenant.name;
    const schoolMap = new Map<string, { name: string; code: string }>();
    matchedSchools.forEach((s: any) => schoolMap.set(s.id, { name: s.name, code: s.code }));

    const users: SchoolUserItem[] = [];

    // 3. Ambil data pengguna/guru asli dari DB Jurnal Mengajar (`users`)
    if (schoolIds.length > 0) {
      const { data: jUsers } = await jurnalMengajarSupabase
        .from("users")
        .select("id, full_name, email, role, position, created_at, phone, school_id")
        .in("school_id", schoolIds)
        .order("full_name", { ascending: true });

      (jUsers || []).forEach((u: any) => {
        const roleName = u.role === "admin" ? "Admin Sekolah" : u.role === "pending_guru" ? "Pending Guru" : "Guru Pengajar";
        const isPending = u.role === "pending_guru" || /pending/i.test(u.role || "");
        const sInfo = schoolMap.get(u.school_id);
        const schoolLabel = sInfo ? `${sInfo.name} (${sInfo.code})` : schoolCodes.join(", ");

        users.push({
          id: u.id,
          school_code: schoolLabel,
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
    }

    const totalTeachers = users.length;
    const activeUsers = users.filter((u) => u.status === "aktif").length;
    const totalSubjects = new Set(users.map((u) => u.subject).filter((s) => s && s !== "-")).size;

    return {
      schoolCode: schoolCodes.join(", "),
      tenantName: tenantNameDisplay,
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
