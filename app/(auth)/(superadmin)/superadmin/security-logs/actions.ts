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
    // Baca log dari public.audit_logs tanpa membuang trigger auth resmi
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, entity, ip_address, user_agent, created_at, user_id, user_role, payload_changes")
      .order("created_at", { ascending: false })
      .limit(150);

    const rawLogs: any[] = [];
    
    // Helper function for checking foreign IP
    const checkForeignIP = (ipStr: string) => {
      const ip = ipStr || "";
      if (!ip || ip === "-" || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) return false;
      return !ip.startsWith("180.") && !ip.startsWith("36.") && !ip.startsWith("114.");
    };

    // Kumpulkan semua user_id unik untuk resolusi email & profile
    const uniqueUserIds = new Set<string>();
    if (!dbError && dbData) {
      dbData.forEach((item: any) => {
        if (item.user_id) uniqueUserIds.add(item.user_id);
      });
    }

    // Ambil data user dari Supabase Auth Admin & public.users
    const authUserMap = new Map<string, { email?: string; full_name?: string }>();
    if (uniqueUserIds.size > 0) {
      const userPromises = Array.from(uniqueUserIds).map(async (uid) => {
        try {
          const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (!error && u?.user) {
            authUserMap.set(uid, {
              email: u.user.email,
              full_name: (u.user.user_metadata as any)?.full_name
            });
          }
        } catch {
          // ignore error
        }
      });
      await Promise.all(userPromises);

      // Ambil pula dari public.users jika belum punya email di authUserMap
      try {
        const { data: publicUsers } = await supabaseAdmin
          .from("users")
          .select("id, email, full_name")
          .in("id", Array.from(uniqueUserIds));
        
        (publicUsers || []).forEach((pu: any) => {
          const existing = authUserMap.get(pu.id) || {};
          authUserMap.set(pu.id, {
            email: existing.email || pu.email,
            full_name: existing.full_name || pu.full_name
          });
        });
      } catch {}
    }

    if (!dbError && dbData) {
      // Filter hanya log autentikasi & aktivitas relevan
      const authLogs = dbData.filter((item: any) => {
        const act = String(item.action || "").toUpperCase();
        const ent = String(item.entity || "").toUpperCase();
        return (
          ent === "AUTH" ||
          ent === "USER" ||
          act.includes("LOGIN") ||
          act.includes("LOGOUT") ||
          act.includes("REGISTER") ||
          act.includes("AUTH") ||
          act.includes("USER_PROFILE")
        );
      });

      authLogs.forEach((item: any) => {
        const actionText = String(item.action || item.entity || "LOGIN").toUpperCase();
        const ip = item.ip_address || "127.0.0.1";
        const userAgent = item.user_agent || "JM-Panel Web Portal";

        const isScript =
          userAgent.toLowerCase().includes("python") ||
          userAgent.toLowerCase().includes("postman") ||
          userAgent.toLowerCase().includes("curl") ||
          userAgent.toLowerCase().includes("axios");

        const isForeignIP = checkForeignIP(ip);
        const isFailed = actionText.includes("FAIL") || actionText.includes("ERROR") || actionText.includes("DENIED");

        const isSuspicious = isScript || isForeignIP || isFailed;

        let suspiciousReason = "";
        if (isFailed) {
          suspiciousReason = item.payload_changes?.reason || "Kredensial Salah / Percobaan Access Gagal";
        } else if (isScript) {
          suspiciousReason = "Perangkat Script/Tool HTTP (Postman/Python/Curl)";
        } else if (isForeignIP) {
          suspiciousReason = "IP Luar Negeri / Server Proxy";
        }

        // Tentukan event type secara konsisten (LOGOUT tetap LOGOUT, LOGIN tetap LOGIN, REGISTER tetap REGISTER)
        let event: SuperadminSecurityLogItem["event"] = "LOGIN";
        if (actionText.includes("LOGOUT") || actionText.includes("SIGN_OUT")) {
          event = "LOGOUT";
        } else if (actionText.includes("REGISTER") || actionText.includes("SIGN_UP") || actionText.includes("USER_PROFILE_CREATED")) {
          event = "REGISTER";
        } else if (actionText.includes("RESET") || actionText.includes("PASSWORD")) {
          event = "PASSWORD_RESET";
        } else if (isFailed) {
          event = "SUSPICIOUS_ATTEMPT";
        } else {
          event = "LOGIN";
        }

        let resolvedEmail = item.payload_changes?.email;
        let resolvedName = "";
        if (item.user_id) {
          const uInfo = authUserMap.get(item.user_id);
          if (!resolvedEmail && uInfo?.email) resolvedEmail = uInfo.email;
          if (uInfo?.full_name) resolvedName = uInfo.full_name;
        }

        const displayEmail = resolvedEmail
          ? (resolvedName ? `${resolvedName} (${resolvedEmail})` : resolvedEmail)
          : (item.user_id ? `Pengguna (${item.user_id.slice(0, 8)}...)` : "Pengguna Tamu");

        rawLogs.push({
          id: item.id,
          rawDate: item.created_at,
          email: displayEmail,
          event,
          ip,
          location: isForeignIP ? "Luar Negeri / Proxy" : (ip === "127.0.0.1" ? "Localhost" : "Indonesia (ISP Lokal)"),
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
