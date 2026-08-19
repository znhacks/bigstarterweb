"use client";

import * as React from "react";
import { useState } from "react";
import { ShieldAlert, Activity, Smartphone, Search, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type SuperadminSecurityLogItem } from "./actions";

interface ViewProps {
  logs: SuperadminSecurityLogItem[];
  stats: {
    totalLogs: number;
    safeCount: number;
    suspiciousCount: number;
    activeDevices: number;
  };
  locale: string;
}

export function SuperadminSecurityLogsView({ logs: initialLogs, stats: initialStats, locale }: ViewProps) {
  const isId = locale === "id";
  const [logs, setLogs] = useState<SuperadminSecurityLogItem[]>(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { getSuperadminSecurityLogsAction } = await import("./actions");
      const res = await getSuperadminSecurityLogsAction();
      setLogs(res.logs);
      setStats(res.stats);
    } catch (err) {
      console.error(isId ? "Gagal memperbarui log keamanan superadmin:" : "Failed to refresh superadmin security logs:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesEvent =
        eventFilter === "ALL" ||
        (eventFilter === "SUSPICIOUS" && log.isSuspicious) ||
        log.event === eventFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        log.email.toLowerCase().includes(q) ||
        log.ip.includes(q) ||
        log.device.toLowerCase().includes(q) ||
        log.location.toLowerCase().includes(q);

      return matchesEvent && matchesSearch;
    });
  }, [logs, eventFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            {isId ? "Log Keamanan & Deteksi  Web Portal (JM-Panel)" : "Security Logs & Intrusion Detection Web Portal (JM-Panel)"}
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            {isId ? "Pusat pemantauan log autentikasi (Login, Logout, Register) dan deteksi percobaan akses tidak sah secara khusus di Web Portal JM-Panel." : "Monitoring center for authentication logs (Login, Logout, Register) and detection of unauthorized access attempts specifically on the JM-Panel Web Portal."}
          </p>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? (isId ? "Memuat Log..." : "Loading Logs...") : (isId ? "Perbarui Data" : "Refresh Logs")}
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/60">
        <div className="flex flex-wrap gap-2">
          {["ALL", "LOGIN", "REGISTER", "LOGOUT", "SUSPICIOUS"].map((item) => (
            <Button
              key={item}
              size="sm"
              variant={eventFilter === item ? (item === "SUSPICIOUS" ? "destructive" : "default") : "outline"}
              onClick={() => setEventFilter(item)}
              className="text-xs font-semibold"
            >
              {item === "ALL" ? (isId ? "Semua Log" : "All Logs") : item === "SUSPICIOUS" ? (isId ? "⚠️  PENYUSUP" : "⚠️  INTRUDER") : item}
            </Button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder={isId ? "Cari Email, IP, atau Device..." : "Search Email, IP, or Device..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Log Table View */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/60 uppercase font-mono tracking-wider">
              <tr>
                <th className="p-3.5">{isId ? "Waktu (WIB)" : "Time (WIB)"}</th>
                <th className="p-3.5">{isId ? "Pengguna Web" : "Web User"}</th>
                <th className="p-3.5">{isId ? "Event Auth" : "Auth Event"}</th>
                <th className="p-3.5">{isId ? "IP & Estimasi Lokasi" : "IP & Estimated Location"}</th>
                <th className="p-3.5">{isId ? "Browser / Device Agent" : "Browser / Device Agent"}</th>
                <th className="p-3.5 text-right">{isId ? "Status Keamanan" : "Security Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {isId ? "Belum ada data log keamanan yang cocok dengan pencarian/filter." : "No security log data found matching the search/filter."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-muted/40 transition-colors ${log.isSuspicious ? "bg-destructive/10" : ""
                      }`}
                  >
                    <td className="p-3.5 text-muted-foreground font-mono whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 font-semibold text-foreground">{log.email}</td>
                    <td className="p-3.5">
                      <Badge
                        className={`font-bold text-[10px] uppercase ${log.event === "LOGIN"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : log.event === "REGISTER"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                            : log.event === "LOGOUT"
                              ? "bg-gray-500/10 text-gray-600 border-gray-500/20"
                              : "bg-destructive/20 text-destructive border-destructive/30"
                          }`}
                      >
                        {log.event}
                      </Badge>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-mono font-semibold">{log.ip}</div>
                      <div className="text-[10px] text-muted-foreground">{log.location}</div>
                    </td>
                    <td className="p-3.5 text-muted-foreground max-w-[220px] truncate" title={log.device}>
                      {log.device}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      {log.isSuspicious ? (
                        <div className="inline-flex flex-col items-end">
                          <Badge variant="destructive" className="text-[10px] font-bold gap-1">
                            ⚠️  RISK
                          </Badge>
                          {log.suspiciousReason && (
                            <span className="text-[9px] text-destructive mt-0.5 max-w-[150px] leading-tight">
                              {log.suspiciousReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                          ✓ SAFE
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
