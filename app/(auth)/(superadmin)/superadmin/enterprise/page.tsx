"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Mail, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface EnterpriseInquiry {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  plan_id: string | null;
  name: string | null;
  email: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

type Status = "new" | "contacted" | "closed";

const STATUS_OPTIONS: Status[] = ["new", "contacted", "closed"];

function statusBadgeClass(status: string) {
  switch (status) {
    case "new":
      return "border-blue-500/20 bg-blue-500/10 text-blue-600";
    case "contacted":
      return "border-amber-500/20 bg-amber-500/10 text-amber-600";
    case "closed":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";
    default:
      return "bg-muted text-muted-foreground border-border/60";
  }
}

export default function SuperadminEnterprisePage() {
  const [inquiries, setInquiries] = useState<EnterpriseInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchInquiries = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Sesi tidak ditemukan. Silakan login ulang.");
        return;
      }

      const res = await fetch("/api/admin/enterprise", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat inquiry");
      }

      setInquiries((json.inquiries as EnterpriseInquiry[]) ?? []);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleStatusChange = async (id: string, status: Status) => {
    setUpdatingId(id);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Sesi tidak ditemukan. Silakan login ulang.");
        return;
      }

      const res = await fetch(`/api/admin/enterprise/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memperbarui status");
      }

      setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, status } : inq)));
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Enterprise Inquiries
          </h1>
          <p className="text-muted-foreground text-sm">
            Permintaan kontak paket enterprise dari penyewa.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs"
          onClick={() => fetchInquiries(true)}
          disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="me-2 h-4 w-4" />
          )}
          Muat ulang
        </Button>
      </div>

      {error && (
        <div className="border-destructive/30 text-destructive bg-destructive/5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat inquiry...
        </div>
      ) : inquiries.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            Belum ada inquiry enterprise.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <Card key={inq.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                      <Mail className="text-primary h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <CardTitle className="text-base font-semibold">
                        {inq.name || "Tanpa nama"}
                      </CardTitle>
                      <CardDescription className="text-xs">{inq.email || "-"}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusBadgeClass(
                      inq.status
                    )}`}>
                    {inq.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-foreground font-medium">Paket: </span>
                    {inq.plan_id || "-"}
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Dikirim: </span>
                    {inq.created_at ? new Date(inq.created_at).toLocaleString("id-ID") : "-"}
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Tenant: </span>
                    <span className="font-mono">{inq.tenant_id || "-"}</span>
                  </div>
                </div>

                {inq.message && (
                  <p className="text-foreground border-border/60 bg-muted/40 rounded-md border p-3 text-sm">
                    {inq.message}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Ubah status:</span>
                  <Select
                    value={inq.status}
                    onValueChange={(v) => handleStatusChange(inq.id, v as Status)}
                    disabled={updatingId === inq.id}>
                    <SelectTrigger size="sm" className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingId === inq.id && (
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
