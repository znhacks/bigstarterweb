"use server";

import { createClient } from "@/lib/supabase/server";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { jurnalMengajarSupabase } from "@/lib/jurnalmengajar-supabase";

export interface ActivityLogItem {
  id: string;
  school_code: string;
  user_name: string;
  user_role: string;
  activity_type: string;
  device_info: string;
  ip_address: string;
  status: "success" | "warning" | "error";
  created_at: string;
}

export async function getActivityLogsData(tenantSlug: string): Promise<{
  schoolCode: string | null;
  tenantName: string | null;
  logs: ActivityLogItem[];
  stats: {
    totalToday: number;
    activeDevices: number;
    successRate: number;
  };
}> {
  try {
    const supabase = await createClient();

    // 1. Ambil data tenant dari DB Bigstarter untuk tahu school_code-nya
    const { data: tenant } = await (await tenantRepository(supabase))
      .query()
      .select("id, name, school_code")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant || !tenant.school_code) {
      return {
        schoolCode: tenant?.school_code || null,
        tenantName: tenant?.name || null,
        logs: [],
        stats: { totalToday: 0, activeDevices: 0, successRate: 100 }
      };
    }

    const schoolCodes = tenant.school_code
      .split(",")
      .map((c: string) => c.trim())
      .filter(Boolean);

    // 2. Ambil data sekolah dari DB Jurnal Mengajar berdasarkan `schoolCodes`
    const { data: schools } = await jurnalMengajarSupabase
      .from("schools")
      .select("id, name, code");

    const matchedSchools = (schools || []).filter((s: any) =>
      schoolCodes.some((code: string) => s.code?.toLowerCase() === code.toLowerCase())
    );

    const schoolIds = matchedSchools.map((s: any) => s.id);
    const tenantNameDisplay = matchedSchools.map((s: any) => s.name).join(", ") || tenant.name;

    // 3. Ambil peta pengguna sekolah dari DB Jurnal Mengajar
    const userMap = new Map<string, { full_name: string; role: string }>();

    if (schoolIds.length > 0) {
      const { data: usersData } = await jurnalMengajarSupabase
        .from("users")
        .select("id, full_name, role, position")
        .in("school_id", schoolIds);

      (usersData || []).forEach((u: any) => {
        userMap.set(u.id, {
          full_name: u.full_name || u.position || "Pengguna Jurnal",
          role: u.position || u.role || "Guru"
        });
      });
    }

    const logs: ActivityLogItem[] = [];

    // 4. Ambil log aktivitas asli dari DB Jurnal Mengajar (tabel `audit_logs`)
    if (schoolIds.length > 0) {
      const { data: dbLogs } = await jurnalMengajarSupabase
        .from("audit_logs")
        .select("id, action, entity, ip_address, user_agent, created_at, user_id, user_role")
        .in("school_id", schoolIds)
        .order("created_at", { ascending: false })
        .limit(100);

      (dbLogs || []).forEach((dl: any) => {
        const uInfo = userMap.get(dl.user_id) || {
          full_name: "Pengguna Mobile",
          role: dl.user_role || "Guru"
        };

        const isFailed = /FAILED|ERROR/i.test(dl.action || "");

        logs.push({
          id: dl.id,
          school_code: schoolCodes.join(", "),
          user_name: uInfo.full_name,
          user_role: uInfo.role,
          activity_type: (dl.action || dl.entity || "Aktivitas App").replace(/_/g, " "),
          device_info: dl.user_agent || "Mobile App Jurnal Mengajar",
          ip_address: dl.ip_address || "-",
          status: isFailed ? "error" : "success",
          created_at: dl.created_at
        });
      });
    }

    // Jika audit_logs sekolah tersebut belum banyak, ambil log aktivitas umum dari audit_logs terbaru
    if (logs.length === 0) {
      const { data: generalLogs } = await jurnalMengajarSupabase
        .from("audit_logs")
        .select("id, action, entity, ip_address, user_agent, created_at, user_id, user_role")
        .order("created_at", { ascending: false })
        .limit(20);

      (generalLogs || []).forEach((dl: any) => {
        const isFailed = /FAILED|ERROR/i.test(dl.action || "");
        logs.push({
          id: dl.id,
          school_code: schoolCodes.join(", "),
          user_name: dl.user_role === "guru" ? "Guru Sekolah" : "Pengguna System",
          user_role: dl.user_role || "Sistem Mobile",
          activity_type: (dl.action || dl.entity || "Aktivitas App").replace(/_/g, " "),
          device_info: dl.user_agent || "Mobile App",
          ip_address: dl.ip_address || "-",
          status: isFailed ? "error" : "success",
          created_at: dl.created_at
        });
      });
    }

    const totalToday = logs.length;
    const activeDevices = new Set(logs.map((l) => l.device_info).filter((d) => d && d !== "-")).size;
    const successCount = logs.filter((l) => l.status === "success").length;
    const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100;

    return {
      schoolCode: schoolCodes.join(", "),
      tenantName: tenantNameDisplay,
      logs,
      stats: { totalToday, activeDevices, successRate }
    };
  } catch (error) {
    console.error("Failed to fetch activity logs from Jurnal Mengajar DB:", error);
    return {
      schoolCode: null,
      tenantName: null,
      logs: [],
      stats: { totalToday: 0, activeDevices: 0, successRate: 0 }
    };
  }
}
