"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
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
  connectedSchools: { id: string; name: string; code: string }[];
  logs: ActivityLogItem[];
  stats: {
    totalToday: number;
    activeDevices: number;
    successRate: number;
  };
}> {
  try {
    const supabase = await createClient();
    const dbClient = supabaseAdmin || supabase;

    // 1. Ambil data tenant dari DB Bigstarter (bypasses RLS)
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
        logs: [],
        stats: { totalToday: 0, activeDevices: 0, successRate: 100 }
      };
    }

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

    // 2. Ambil data sekolah dari DB Jurnal Mengajar berdasarkan `schoolCodes`
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

    // 3. Ambil peta pengguna sekolah dari DB Jurnal Mengajar
    const userMap = new Map<string, { full_name: string; role: string; school_id?: string }>();

    if (schoolIds.length > 0) {
      const { data: usersData } = await jurnalMengajarSupabase
        .from("users")
        .select("id, full_name, role, position, school_id")
        .in("school_id", schoolIds);

      (usersData || []).forEach((u: any) => {
        userMap.set(u.id, {
          full_name: u.full_name || u.position || "Pengguna Jurnal",
          role: u.position || u.role || "Guru",
          school_id: u.school_id
        });
      });
    }

    const logs: ActivityLogItem[] = [];

    // 4. Ambil log aktivitas asli dari DB Jurnal Mengajar (tabel `audit_logs`)
    if (schoolIds.length > 0) {
      const { data: dbLogs } = await jurnalMengajarSupabase
        .from("audit_logs")
        .select("id, action, entity, ip_address, user_agent, created_at, user_id, user_role, school_id")
        .in("school_id", schoolIds)
        .order("created_at", { ascending: false })
        .limit(100);

      (dbLogs || []).forEach((dl: any) => {
        const uInfo = userMap.get(dl.user_id) || {
          full_name: "Pengguna Mobile",
          role: dl.user_role || "Guru",
          school_id: dl.school_id
        };
        const sInfo = schoolMap.get(dl.school_id || uInfo.school_id || "");
        const schoolLabel = sInfo ? `${sInfo.name} (${sInfo.code})` : schoolCodes.join(", ");

        const isFailed = /FAILED|ERROR/i.test(dl.action || "");

        logs.push({
          id: dl.id,
          school_code: schoolLabel,
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

    const connectedSchools = matchedSchools.map((s: any) => ({
      id: s.id,
      name: s.name || s.code,
      code: s.code
    }));

    return {
      schoolCode: schoolCodes.join(", "),
      tenantName: tenantNameDisplay,
      connectedSchools,
      logs,
      stats: { totalToday, activeDevices, successRate }
    };
  } catch (error) {
    console.error("Failed to fetch activity logs from Jurnal Mengajar DB:", error);
    return {
      schoolCode: null,
      tenantName: null,
      connectedSchools: [],
      logs: [],
      stats: { totalToday: 0, activeDevices: 0, successRate: 0 }
    };
  }
}
