"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { jurnalMengajarSupabase } from "@/lib/jurnalmengajar-supabase";

export interface JournalLogItem {
  id: string;
  school_code: string;
  teacher_name: string;
  class_name: string;
  subject: string;
  teaching_date: string;
  start_time: string;
  end_time: string;
  topic: string;
  attendance_summary: string;
  status: "terverifikasi" | "pending" | "draf";
  created_at: string;
}

export async function getJournalLogsData(tenantSlug: string): Promise<{
  schoolCode: string | null;
  tenantName: string | null;
  connectedSchools: { id: string; name: string; code: string }[];
  journals: JournalLogItem[];
  stats: {
    totalJournals: number;
    verifiedJournals: number;
    totalClasses: number;
  };
}> {
  try {
    const supabase = await createClient();
    const dbClient = supabaseAdmin || supabase;

    // 1. Ambil data tenant dari Bigstarter DB via dbClient (bypasses RLS)
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
        journals: [],
        stats: { totalJournals: 0, verifiedJournals: 0, totalClasses: 0 }
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

    // Fallback: Jika matchedSchools kosong tetapi DB Jurnal Mengajar punya sekolah, tampilkan sekolah yang ada
    if (matchedSchools.length === 0 && (schools || []).length > 0) {
      matchedSchools = schools || [];
    }

    const schoolIds = matchedSchools.map((s: any) => s.id);
    const tenantNameDisplay = matchedSchools.map((s: any) => s.name).join(", ") || tenant.name;
    const schoolMap = new Map<string, { name: string; code: string }>();
    matchedSchools.forEach((s: any) => schoolMap.set(s.id, { name: s.name, code: s.code }));

    const journals: JournalLogItem[] = [];

    const connectedSchools = matchedSchools.map((s: any) => ({
      id: s.id,
      name: s.name || s.code,
      code: s.code
    }));

    if (schoolIds.length === 0) {
      return {
        schoolCode: schoolCodes.join(", "),
        tenantName: tenantNameDisplay,
        connectedSchools: [],
        journals: [],
        stats: { totalJournals: 0, verifiedJournals: 0, totalClasses: 0 }
      };
    }

    // Peta pembantu untuk guru, kelas, mapel dari DB Jurnal Mengajar
    const teacherMap = new Map<string, string>();
    const classMap = new Map<string, string>();
    const subjectMap = new Map<string, string>();

    const [{ data: jTeachers }, { data: jClasses }, { data: jSubjects }] = await Promise.all([
      jurnalMengajarSupabase.from("users").select("id, full_name"),
      jurnalMengajarSupabase.from("classes").select("id, name"),
      jurnalMengajarSupabase.from("subjects").select("id, name")
    ]);

    (jTeachers || []).forEach((t: any) => teacherMap.set(t.id, t.full_name));
    (jClasses || []).forEach((c: any) => classMap.set(c.id, c.name));
    (jSubjects || []).forEach((s: any) => subjectMap.set(s.id, s.name));

    // 3. Query data jurnal mengajar asli dari DB Jurnal Mengajar (`journals`)
    const { data: dbJournals } = await jurnalMengajarSupabase
      .from("journals")
      .select("id, date, teaching_hour, material, sick_count, permission_count, alpha_count, status, teacher_id, class_id, subject_id, created_at, school_id")
      .in("school_id", schoolIds)
      .order("date", { ascending: false })
      .limit(100);

    (dbJournals || []).forEach((j: any) => {
      const teacherName = teacherMap.get(j.teacher_id) || "Guru Pengajar";
      const className = classMap.get(j.class_id) || "Kelas XII";
      const subjectName = subjectMap.get(j.subject_id) || "Mata Pelajaran";
      const sInfo = schoolMap.get(j.school_id);
      const schoolLabel = sInfo ? `${sInfo.name} (${sInfo.code})` : schoolCodes.join(", ");

      const sick = j.sick_count || 0;
      const perm = j.permission_count || 0;
      const alpha = j.alpha_count || 0;
      const attendanceSummary = `Sakit: ${sick}, Izin: ${perm}, Alfa: ${alpha}`;

      const statusFormatted: "terverifikasi" | "pending" | "draf" =
        j.status === "verified" || j.status === "terverifikasi"
          ? "terverifikasi"
          : j.status === "pending"
          ? "pending"
          : "draf";

      const tHour = j.teaching_hour || 1;
      const startTime = `Jam Ke-${tHour}`;
      const endTime = `Jam Ke-${tHour + 1}`;

      journals.push({
        id: j.id,
        school_code: schoolLabel,
        teacher_name: teacherName,
        class_name: className,
        subject: subjectName,
        teaching_date: j.date || new Date().toISOString().split("T")[0],
        start_time: startTime,
        end_time: endTime,
        topic: j.material || "Materi Pembelajaran",
        attendance_summary: attendanceSummary,
        status: statusFormatted,
        created_at: j.created_at || new Date().toISOString()
      });
    });

    const totalJournals = journals.length;
    const verifiedJournals = journals.filter((j) => j.status === "terverifikasi").length;
    const totalClasses = new Set(journals.map((j) => j.class_name)).size;

    return {
      schoolCode: schoolCodes.join(", "),
      tenantName: tenantNameDisplay,
      connectedSchools,
      journals,
      stats: { totalJournals, verifiedJournals, totalClasses }
    };
  } catch (error) {
    console.error("Failed to fetch journal logs from Jurnal Mengajar DB:", error);
    return {
      schoolCode: null,
      tenantName: null,
      connectedSchools: [],
      journals: [],
      stats: { totalJournals: 0, verifiedJournals: 0, totalClasses: 0 }
    };
  }
}
