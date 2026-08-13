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
    // 1. Cek log autentikasi dari schema auth (auth.audit_log_entries)
    const { data: authAudit, error: authAuditError } = await supabaseAdmin
      .schema("auth")
      .from("audit_log_entries")
      .select("id, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!authAuditError && authAudit && authAudit.length > 0) {
      logs = authAudit.map((entry: any) => {
        const payload = entry.payload || {};
        const ip = payload.ip_address || "127.0.0.1";
        const userAgent = payload.user_agent || "Browser / Web Session";
        const action = (payload.action || "user_login").toLowerCase();
        const email = payload.actor_email || payload.email || "user@jmpanel.id";

        let event: SuperadminSecurityLogItem["event"] = "LOGIN";
        if (action.includes("signup") || action.includes("register")) event = "REGISTER";
        else if (action.includes("logout") || action.includes("sign_out")) event = "LOGOUT";
        else if (action.includes("reset") || action.includes("recovery")) event = "PASSWORD_RESET";

        const isScript =
          userAgent.toLowerCase().includes("python") ||
          userAgent.toLowerCase().includes("postman") ||
          userAgent.toLowerCase().includes("curl") ||
          userAgent.toLowerCase().includes("axios");

        const isForeignIP = !ip.startsWith("180.") && !ip.startsWith("36.") && !ip.startsWith("114.") && ip !== "127.0.0.1";
        const isFailed = action.includes("fail") || action.includes("error") || action.includes("denied");

        const isSuspicious = isScript || isForeignIP || isFailed;

        let suspiciousReason = "";
        if (isScript) suspiciousReason = "Deteksi Script/Tool HTTP (Postman/Python/Curl)";
        else if (isForeignIP) suspiciousReason = "IP Luar Negeri / Proxy Terdeteksi";
        else if (isFailed) suspiciousReason = "Percobaan Login Gagal / Akses Ditolak";

        return {
          id: entry.id,
          timestamp: new Date(entry.created_at).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "medium"
          }),
          email,
          event,
          ip,
          location: isForeignIP ? "Luar Negeri / Proxy" : "Indonesia (ISP Lokal)",
          device: userAgent,
          isSuspicious,
          suspiciousReason
        };
      });
    }

    // 2. Jika auth.audit_log_entries kosong, baca dari public.audit_logs web jmpanel
    if (logs.length === 0) {
      const { data: dbLogs } = await supabaseAdmin
        .from("audit_logs")
        .select("id, action, entity, ip_address, user_agent, created_at, user_id, user_role")
        .order("created_at", { ascending: false })
        .limit(50);

      if (dbLogs) {
        logs = dbLogs.map((item: any) => {
          const actionText = (item.action || item.entity || "LOGIN").toLowerCase();
          const ip = item.ip_address || "127.0.0.1";
          const userAgent = item.user_agent || "JM-Panel Web Portal";

          const isScript =
            userAgent.toLowerCase().includes("python") ||
            userAgent.toLowerCase().includes("postman") ||
            userAgent.toLowerCase().includes("curl");

          const isForeignIP = !ip.startsWith("180.") && !ip.startsWith("36.") && !ip.startsWith("114.") && ip !== "127.0.0.1";
          const isFailed = actionText.includes("fail") || actionText.includes("error");

          const isSuspicious = isScript || isForeignIP || isFailed;

          let suspiciousReason = "";
          if (isScript) suspiciousReason = "Perangkat Script/Tool HTTP (Postman/Python)";
          else if (isForeignIP) suspiciousReason = "IP Luar Negeri / Proxy";
          else if (isFailed) suspiciousReason = "Aktivitas Gagal / Error";

          let event: SuperadminSecurityLogItem["event"] = "LOGIN";
          if (actionText.includes("logout")) event = "LOGOUT";
          else if (actionText.includes("register")) event = "REGISTER";
          else if (isSuspicious) event = "SUSPICIOUS_ATTEMPT";

          return {
            id: item.id,
            timestamp: new Date(item.created_at).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              dateStyle: "medium",
              timeStyle: "medium"
            }),
            email: item.user_role === "superadmin" ? "superadmin@jmpanel.id" : "admin@jmpanel.id",
            event,
            ip,
            location: isForeignIP ? "Luar Negeri / Proxy" : "Indonesia (ISP Lokal)",
            device: userAgent,
            isSuspicious,
            suspiciousReason
          };
        });
      }
    }
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
