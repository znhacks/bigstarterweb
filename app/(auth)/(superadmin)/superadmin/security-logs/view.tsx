"use client";

import * as React from "react";
import { useState } from "react";
import { ShieldAlert, ShieldCheck, Activity, Smartphone, Search, RefreshCw, AlertTriangle, Lock } from "lucide-react";
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
}

export function SuperadminSecurityLogsView({ logs: initialLogs, stats: initialStats }: ViewProps) {
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
      console.error("Gagal memperbarui log keamanan superadmin:", err);
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
            Log Keamanan &amp; Deteksi Intruder Web Portal (JM-Panel)
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Pusat pemantauan log autentikasi (Login, Logout, Register) dan deteksi percobaan akses tidak sah secara khusus di Web Portal JM-Panel.
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
          {isRefreshing ? "Memuat Log..." : "Refresh Logs"}
        </Button>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 flex items-center gap-4 border-border/60">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Auth Logs</p>
            <p className="text-2xl font-bold">{stats.totalLogs}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-border/60">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Akses Wajar &amp; Aman</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.safeCount}</p>
          </div>
        </Card>

        <Card className={`p-4 flex items-center gap-4 ${stats.suspiciousCount > 0 ? "border-destructive/40 bg-destructive/5" : "border-border/60"}`}>
          <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Potensi Intruder / Proxy</p>
            <p className="text-2xl font-bold text-destructive">{stats.suspiciousCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-border/60">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IP / Perangkat Aktif</p>
            <p className="text-2xl font-bold">{stats.activeDevices}</p>
          </div>
        </Card>
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
              {item === "ALL" ? "Semua Log" : item === "SUSPICIOUS" ? "⚠️ Intruder / Mencurigakan" : item}
            </Button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Cari Email, IP, atau Device..."
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
                <th className="p-3.5">Waktu (WIB)</th>
                <th className="p-3.5">Pengguna Web</th>
                <th className="p-3.5">Event Auth</th>
                <th className="p-3.5">IP &amp; Estimasi Lokasi</th>
                <th className="p-3.5">Browser / Device Agent</th>
                <th className="p-3.5 text-right">Status Keamanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Belum ada data log keamanan yang cocok dengan pencarian/filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      log.isSuspicious ? "bg-destructive/10" : ""
                    }`}
                  >
                    <td className="p-3.5 text-muted-foreground font-mono whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 font-semibold text-foreground">{log.email}</td>
                    <td className="p-3.5">
                      <Badge
                        className={`font-bold text-[10px] uppercase ${
                          log.event === "LOGIN"
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
                            ⚠️ INTRUDER RISK
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
