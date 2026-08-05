"use server";

import { createClient } from "@/lib/supabase/server";
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
  journals: JournalLogItem[];
  stats: {
    totalJournals: number;
    verifiedJournals: number;
    totalClasses: number;
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
        journals: [],
        stats: { totalJournals: 0, verifiedJournals: 0, totalClasses: 0 }
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
      schoolCodes.some((code: string) => s.code?.toLowerCase() === code.toLowerCase())
    );

    const schoolIds = matchedSchools.map((s: any) => s.id);
    const tenantNameDisplay = matchedSchools.map((s: any) => s.name).join(", ") || tenant.name;
    const journals: JournalLogItem[] = [];

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
    let journalQuery = jurnalMengajarSupabase
      .from("journals")
      .select("id, date, teaching_hour, material, sick_count, permission_count, alpha_count, status, teacher_id, class_id, subject_id, created_at, school_id")
      .order("date", { ascending: false })
      .limit(100);

    if (schoolIds.length > 0) {
      journalQuery = journalQuery.in("school_id", schoolIds);
    }

    const { data: dbJournals } = await journalQuery;

    (dbJournals || []).forEach((j: any) => {
      const teacherName = teacherMap.get(j.teacher_id) || "Guru Pengajar";
      const className = classMap.get(j.class_id) || "Kelas XII";
      const subjectName = subjectMap.get(j.subject_id) || "Mata Pelajaran";

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
        school_code: schoolCodes.join(", "),
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
      journals,
      stats: { totalJournals, verifiedJournals, totalClasses }
    };
  } catch (error) {
    console.error("Failed to fetch journal logs from Jurnal Mengajar DB:", error);
    return {
      schoolCode: null,
      tenantName: null,
      journals: [],
      stats: { totalJournals: 0, verifiedJournals: 0, totalClasses: 0 }
    };
  }
}
