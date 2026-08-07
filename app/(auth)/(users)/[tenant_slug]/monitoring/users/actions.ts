"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
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
  connectedSchools: { id: string; name: string; code: string }[];
  users: SchoolUserItem[];
  stats: {
    totalTeachers: number;
    activeUsers: number;
    totalSubjects: number;
  };
}> {
  try {
    const supabase = await createClient();
    const dbClient = supabaseAdmin || supabase;

    // 1. Ambil data tenant dari Bigstarter DB (bypasses RLS)
    const { data: tenant } = await (await tenantRepository(dbClient))
      .query()
      .select("id, name, school_code")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) {
      return {
        schoolCode: null,
        tenantName: null,
        connectedSchools: [],
        users: [],
        stats: { totalTeachers: 0, activeUsers: 0, totalSubjects: 0 }
      };
    }

    // Ambil dari junction table tenant_schools & user_schools
    const [ { data: tSchools }, { data: { user } } ] = await Promise.all([
      dbClient.from("tenant_schools").select("school_id, school_code").eq("tenant_id", tenant.id),
      supabase.auth.getUser()
    ]);

    const schoolCodeSet = new Set<string>();
    if (tenant.school_code) {
      tenant.school_code.split(",").forEach((c: string) => {
        if (c.trim()) schoolCodeSet.add(c.trim());
      });
    }

    (tSchools || []).forEach((ts: any) => {
      if (ts.school_id) schoolCodeSet.add(ts.school_id.toString());
      if (ts.school_code) schoolCodeSet.add(ts.school_code.toString());
    });

    if (user) {
      const { data: uSchools } = await dbClient
        .from("user_schools")
        .select("school_id, school_code")
        .eq("user_id", user.id);

      (uSchools || []).forEach((us: any) => {
        if (us.school_id) schoolCodeSet.add(us.school_id.toString());
        if (us.school_code) schoolCodeSet.add(us.school_code.toString());
      });
    }

    const schoolCodes = Array.from(schoolCodeSet);

    // 2. Cari data sekolah di DB Jurnal Mengajar berdasar `schoolCodes`
    const { data: schools } = await jurnalMengajarSupabase
      .from("schools")
      .select("id, name, code");

    let matchedSchools = (schools || []).filter((s: any) =>
      schoolCodes.some((code: string) => {
        const cLower = code.toLowerCase();
        return (
          (s.code && s.code.toLowerCase() === cLower) ||
          (s.id && s.id.toString().toLowerCase() === cLower) ||
          (s.npsn && s.npsn.toString().toLowerCase() === cLower) ||
          (s.name && s.name.toLowerCase().includes(cLower)) ||
          cLower.includes((s.name || "").toLowerCase())
        );
      })
    );

    if (matchedSchools.length === 0 && (schools || []).length > 0) {
      matchedSchools = schools || [];
    }

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

    const connectedSchools = matchedSchools.map((s: any) => ({
      id: s.id,
      name: s.name || s.code,
      code: s.code
    }));

    return {
      schoolCode: schoolCodes.join(", "),
      tenantName: tenantNameDisplay,
      connectedSchools,
      users,
      stats: { totalTeachers, activeUsers, totalSubjects }
    };
  } catch (error) {
    console.error("Failed to fetch school users from Jurnal Mengajar DB:", error);
    return {
      schoolCode: null,
      tenantName: null,
      connectedSchools: [],
      users: [],
      stats: { totalTeachers: 0, activeUsers: 0, totalSubjects: 0 }
    };
  }
}
