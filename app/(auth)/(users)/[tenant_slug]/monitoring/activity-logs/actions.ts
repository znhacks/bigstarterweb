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
  event_type: "LOGIN" | "LOGOUT" | "REGISTER" | "PASSWORD_RESET" | "SUSPICIOUS_ATTEMPT" | "ACTIVITY";
  device_info: string;
  ip_address: string;
  location: string;
  is_suspicious: boolean;
  suspicious_reason?: string;
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
    suspiciousCount: number;
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
        stats: { totalToday: 0, activeDevices: 0, suspiciousCount: 0, successRate: 100 }
      };
    }

    const [{ data: tSchools }, { data: { user } }] = await Promise.all([
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

    // Helper  detection
    const analyzeRisk = (action: string, agent: string, ip: string) => {
      const actionLower = (action || "").toLowerCase();
      const agentLower = (agent || "").toLowerCase();

      const isScript = agentLower.includes("postman") || agentLower.includes("python") || agentLower.includes("curl") || agentLower.includes("axios");
      const isForeignIP = Boolean(ip && ip !== "-" && !ip.startsWith("180.") && !ip.startsWith("36.") && !ip.startsWith("114.") && ip !== "127.0.0.1");
      const isFailedAuth = actionLower.includes("fail") || actionLower.includes("unauthorized") || actionLower.includes("denied");

      const isSuspicious = isScript || isForeignIP || isFailedAuth;
      let reason = "";

      if (isScript) reason = "Perangkat Script/Tool HTTP (Postman/Python/Curl)";
      else if (isForeignIP) reason = "IP Luar Negeri / Server Proxy";
      else if (isFailedAuth) reason = "Percobaan Gagal / Akses Tidak Sah";

      let eventType: ActivityLogItem["event_type"] = "ACTIVITY";
      if (actionLower.includes("login") || actionLower.includes("sign_in")) eventType = "LOGIN";
      else if (actionLower.includes("logout") || actionLower.includes("sign_out")) eventType = "LOGOUT";
      else if (actionLower.includes("register") || actionLower.includes("sign_up")) eventType = "REGISTER";
      else if (actionLower.includes("reset") || actionLower.includes("password")) eventType = "PASSWORD_RESET";
      else if (isSuspicious) eventType = "SUSPICIOUS_ATTEMPT";

      return { isSuspicious, reason, eventType, location: isForeignIP ? "Luar Negeri / Proxy" : "Indonesia (ISP Lokal)" };
    };

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

        const actionText = dl.action || dl.entity || "Aktivitas App";
        const isFailed = /FAILED|ERROR/i.test(actionText);
        const { isSuspicious, reason, eventType, location } = analyzeRisk(actionText, dl.user_agent || "", dl.ip_address || "");

        logs.push({
          id: dl.id,
          school_code: schoolLabel,
          user_name: uInfo.full_name,
          user_role: uInfo.role,
          activity_type: actionText.replace(/_/g, " "),
          event_type: eventType,
          device_info: dl.user_agent || "Mobile App Jurnal Mengajar",
          ip_address: dl.ip_address || "-",
          location,
          is_suspicious: isSuspicious,
          suspicious_reason: reason,
          status: isFailed || isSuspicious ? "error" : "success",
          created_at: dl.created_at
        });
      });
    }

    // Jika audit_logs belum ada data, ambil log umum
    if (logs.length === 0) {
      const { data: generalLogs } = await jurnalMengajarSupabase
        .from("audit_logs")
        .select("id, action, entity, ip_address, user_agent, created_at, user_id, user_role")
        .order("created_at", { ascending: false })
        .limit(20);

      (generalLogs || []).forEach((dl: any) => {
        const actionText = dl.action || dl.entity || "Aktivitas App";
        const isFailed = /FAILED|ERROR/i.test(actionText);
        const { isSuspicious, reason, eventType, location } = analyzeRisk(actionText, dl.user_agent || "", dl.ip_address || "");

        logs.push({
          id: dl.id,
          school_code: schoolCodes.join(", "),
          user_name: dl.user_role === "guru" ? "Guru Sekolah" : "Pengguna System",
          user_role: dl.user_role || "Sistem Mobile",
          activity_type: actionText.replace(/_/g, " "),
          event_type: eventType,
          device_info: dl.user_agent || "Mobile App",
          ip_address: dl.ip_address || "-",
          location,
          is_suspicious: isSuspicious,
          suspicious_reason: reason,
          status: isFailed || isSuspicious ? "error" : "success",
          created_at: dl.created_at
        });
      });
    }

    // Hitung statistik akurat berdasarkan waktu hari ini (Asia/Jakarta)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayLogs = logs.filter((l) => {
      const logTime = new Date(l.created_at).getTime();
      return !isNaN(logTime) && logTime >= startOfToday;
    });

    const totalToday = todayLogs.length;

    // Perangkat/IP unik hari ini (jika tidak ada log hari ini, hitung dari 20 log terbaru)
    const deviceScope = todayLogs.length > 0 ? todayLogs : logs.slice(0, 20);
    const activeDevices = new Set(
      deviceScope
        .map((l) => (l.ip_address && l.ip_address !== "-" ? l.ip_address : l.device_info))
        .filter((d) => d && d !== "-" && d !== "Mobile App" && d !== "Mobile App Jurnal Mengajar")
    ).size || (logs.length > 0 ? 1 : 0);

    const suspiciousCount = logs.filter((l) => l.is_suspicious).length;
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
      stats: { totalToday, activeDevices, suspiciousCount, successRate }
    };
  } catch (error) {
    console.error("Failed to fetch activity logs from Jurnal Mengajar DB:", error);
    return {
      schoolCode: null,
      tenantName: null,
      connectedSchools: [],
      logs: [],
      stats: { totalToday: 0, activeDevices: 0, suspiciousCount: 0, successRate: 0 }
    };
  }
}
