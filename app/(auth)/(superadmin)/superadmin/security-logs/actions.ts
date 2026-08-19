"use server";

import { requireSuperadmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";

export interface SuperadminSecurityLogItem {
  id: string;
  timestamp: string;
  email: string;
  event: "LOGIN" | "LOGOUT" | "REGISTER" | "PASSWORD_RESET" | "SUSPICIOUS_ATTEMPT";
  ip: string;
  location: string;
  device: string;
  isSuspicious: boolean;
  suspiciousReason?: string;
}

export async function getSuperadminSecurityLogsAction(): Promise<{
  logs: SuperadminSecurityLogItem[];
  stats: {
    totalLogs: number;
    safeCount: number;
    suspiciousCount: number;
    activeDevices: number;
  };
}> {
  await requireSuperadmin();

  let logs: SuperadminSecurityLogItem[] = [];

  try {
    // Baca dari public.audit_logs web jmpanel dan filter log mobile app
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, entity, ip_address, user_agent, created_at, user_id, user_role, payload_changes")
      .not("user_agent", "ilike", "%Supabase Database Trigger%") // Abaikan trigger dari mobile
      .not("action", "ilike", "%MOBILE%") // Abaikan aksi dari mobile
      .order("created_at", { ascending: false })
      .limit(100);

    const rawLogs: any[] = [];
    
    // Helper function for checking foreign IP
    const checkForeignIP = (ipStr: string) => {
      const ip = ipStr || "127.0.0.1";
      if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) return false;
      return !ip.startsWith("180.") && !ip.startsWith("36.") && !ip.startsWith("114.");
    };

    // Kumpulkan semua user_id unik
    const uniqueUserIds = new Set<string>();
    
    if (!dbError && dbData) {
      dbData.forEach((item: any) => {
        if (item.user_id) uniqueUserIds.add(item.user_id);
      });
    }

    // Ambil data user spesifik untuk email
    const authUserMap = new Map<string, string>();
    if (uniqueUserIds.size > 0) {
      const userPromises = Array.from(uniqueUserIds).map(async (uid) => {
        try {
          const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (!error && u?.user?.email) {
            authUserMap.set(uid, u.user.email);
          }
        } catch {
          // ignore
        }
      });
      await Promise.all(userPromises);
    }

    if (!dbError && dbData) {
      dbData.forEach((item: any) => {
        const actionText = String(item.action || item.entity || "LOGIN").toLowerCase();
        const ip = item.ip_address || "127.0.0.1";
        const userAgent = item.user_agent || "JM-Panel Web Portal";

        const isScript =
          userAgent.toLowerCase().includes("python") ||
          userAgent.toLowerCase().includes("postman") ||
          userAgent.toLowerCase().includes("curl");

        const isForeignIP = checkForeignIP(ip);
        const isFailed = actionText.includes("fail") || actionText.includes("error");

        const isSuspicious = isScript || isForeignIP || isFailed;

        let suspiciousReason = "";
        if (isScript) suspiciousReason = "Perangkat Script/Tool HTTP (Postman/Python)";
        else if (isForeignIP) suspiciousReason = "IP Luar Negeri / Proxy";
        else if (isFailed) suspiciousReason = "Aktivitas Gagal / Error";

        let event: SuperadminSecurityLogItem["event"] = "LOGIN";
        if (actionText.includes("logout") || actionText.includes("sign_out")) event = "LOGOUT";
        else if (actionText.includes("register") || actionText.includes("signup")) event = "REGISTER";
        else if (isSuspicious) event = "SUSPICIOUS_ATTEMPT";

        let resolvedEmail = item.payload_changes?.email;
        if (!resolvedEmail && item.user_id) {
          resolvedEmail = authUserMap.get(item.user_id);
        }
        
        const defaultEmail = item.user_role === "superadmin" ? "superadmin@jmpanel.id" : "admin@jmpanel.id";

        rawLogs.push({
          id: item.id,
          rawDate: item.created_at,
          email: resolvedEmail || defaultEmail,
          event,
          ip,
          location: isForeignIP ? "Luar Negeri / Proxy" : "Indonesia (ISP Lokal)",
          device: userAgent,
          isSuspicious,
          suspiciousReason
        });
      });
    }

    rawLogs.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    logs = rawLogs.slice(0, 100).map((item) => ({
      id: item.id,
      timestamp: new Date(item.rawDate).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "medium"
      }),
      email: item.email,
      event: item.event,
      ip: item.ip,
      location: item.location,
      device: item.device,
      isSuspicious: item.isSuspicious,
      suspiciousReason: item.suspiciousReason
    }));

  } catch (err) {
    console.error("Error fetching superadmin security logs:", err);
  }

  // Hitung statistik akurat
  const totalLogs = logs.length;
  const suspiciousCount = logs.filter((l) => l.isSuspicious).length;
  const safeCount = totalLogs - suspiciousCount;
  const activeDevices = new Set(logs.map((l) => l.ip).filter((ip) => ip && ip !== "-")).size;

  return {
    logs,
    stats: {
      totalLogs,
      safeCount,
      suspiciousCount,
      activeDevices
    }
  };
}
