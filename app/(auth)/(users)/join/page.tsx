"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, Ban, XCircle } from "lucide-react";

import { supabase } from "@/lib/supabase";

interface DecodedToken {
  email: string;
  role: string;
  orgName: string;
}

export default function JoinOrganization() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [decoded, setDecoded] = useState<DecodedToken | null>(null);
  const [activeUser, setActiveUser] = useState<any>(null);

  // State validasi keaktifan undangan
  const [isInviteValid, setIsInviteValid] = useState<boolean | null>(null);

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false); // State baru untuk penolakan
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveUserAndInvitation = async () => {
      setIsLoadingUser(true);

      // 1. Cek User Aktif
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        setActiveUser(user);
      }

      // 2. Dekode Token & Validasi Keaktifan Undangan di Database
      if (token) {
        try {
          const decodedString = Buffer.from(token, "base64").toString("utf-8");
          const decodedData: DecodedToken = JSON.parse(decodedString);
          setDecoded(decodedData);

          // Cari ID Organisasi
          const { data: tenant } = await supabase
            .from("tenants")
            .select("id")
            .eq("name", decodedData.orgName)
            .single();

          if (!tenant) {
            setIsInviteValid(false);
            setIsLoadingUser(false);
            return;
          }

          // Periksa apakah baris undangan masih aktif di tabel 'invitations'
          const { data: inviteRow } = await supabase
            .from("invitations")
            .select("id")
            .eq("tenant_id", tenant.id)
            .eq("email", decodedData.email)
            .maybeSingle();

          if (!inviteRow) {
            setIsInviteValid(false);
          } else {
            setIsInviteValid(true);
          }
        } catch (e) {
          console.error("Invalid token parsing", e);
          setIsInviteValid(false);
        }
      } else {
        setIsInviteValid(false);
      }
      setIsLoadingUser(false);
    };

    checkActiveUserAndInvitation();
  }, [token]);

  // AKSI 1: MENERIMA UNDANGAN (JOIN)
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !decoded) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("id, slug") // Ambil slug juga
        .eq("name", decoded.orgName)
        .single();

      if (tenantError || !tenantData) {
        throw new Error(`Organisasi '${decoded.orgName}' tidak ditemukan.`);
      }

      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", activeUser.id)
        .eq("tenant_id", tenantData.id)
        .maybeSingle();

      if (existingMembership) {
        throw new Error(`Anda sudah terdaftar sebagai anggota di organisasi '${decoded.orgName}'.`);
      }

      // 1. Daftarkan user ke tabel memberships
      const { error: membershipError } = await supabase.from("memberships").insert({
        user_id: activeUser.id,
        tenant_id: tenantData.id,
        role: decoded.role // Simpan peran asli (Owner/Admin/Member)
      });

      if (membershipError) throw membershipError;

      // 2. Hapus baris dari tabel 'invitations' karena sudah resmi bergabung
      await supabase
        .from("invitations")
        .delete()
        .eq("tenant_id", tenantData.id)
        .eq("email", decoded.email);

      // 3. SINKRONISASI STATE KLIEN DAN SERVER COOKIE
      localStorage.setItem("active_org_id", tenantData.id);

      // Pasang cookie active_tenant_id agar Server Components langsung sinkron
      const maxAge = 60 * 60 * 24 * 30; // 30 hari
      document.cookie = `active_tenant_id=${tenantData.id}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

      setIsSuccess(true);

      setTimeout(() => {
        // Redirect ke dashboard dinamis berbasis slug tenant baru Anda
        router.push(`/${tenantData.slug}`);
        router.refresh();
      }, 2000);
    } catch (error: any) {
      setErrorMsg(error.message || "Gagal memproses pendaftaran bergabung.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // AKSI 2: MENOLAK UNDANGAN (DECLINE)
  const handleDeclineInvite = async () => {
    if (!activeUser || !decoded) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id")
        .eq("name", decoded.orgName)
        .single();

      if (!tenantData) {
        throw new Error("Organisasi tidak ditemukan.");
      }

      // Hapus data undangan langsung dari tabel 'invitations'
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("tenant_id", tenantData.id)
        .eq("email", decoded.email);

      if (error) throw error;

      setIsDeclined(true);
    } catch (error: any) {
      setErrorMsg(error.message || "Gagal menolak undangan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // TAMPILAN JIKA UNDANGAN SUDAH DITOLAK
  if (isDeclined) {
    return (
      <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
        <Card className="border-border/85 w-full max-w-md rounded-2xl border py-8 text-center shadow-lg">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <XCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-foreground text-xl font-bold">Undangan Ditolak</h2>
              <p className="text-muted-foreground mx-auto max-w-xs text-sm">
                Anda telah menolak undangan untuk bergabung dengan{" "}
                <strong>{decoded?.orgName}</strong>.
              </p>
            </div>
            <Button variant="outline" className="mt-2" onClick={() => router.push("/")}>
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TAMPILAN JIKA UNDANGAN SUDAH DI-CANCEL / EXPIRED / TIDAK VALID
  if (isInviteValid === false || !decoded || !activeUser) {
    return (
      <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
        <Card className="border-border/85 w-full max-w-md rounded-2xl border py-8 text-center shadow-lg">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Ban className="h-6 w-6 text-red-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-foreground text-xl font-bold">Undangan Tidak Aktif</h2>
              <p className="text-muted-foreground mx-auto max-w-xs text-sm">
                Tautan undangan ini telah dibatalkan oleh admin, kedaluwarsa, atau tidak lagi valid.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDifferentEmail = activeUser.email?.toLowerCase() !== decoded.email.toLowerCase();

  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Card className="border-border/80 w-full max-w-md overflow-hidden rounded-2xl border shadow-lg">
        {isSuccess ? (
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
            <CheckCircle2 className="h-16 w-16 animate-bounce text-emerald-600" />
            <div className="space-y-1">
              <CardTitle className="text-xl">Berhasil Bergabung!</CardTitle>
              <CardDescription>
                Anda sekarang resmi menjadi bagian dari <strong>{decoded.orgName}</strong>.
              </CardDescription>
            </div>
            <p className="text-muted-foreground text-xs">Mengarahkan Anda ke dashboard...</p>
          </CardContent>
        ) : (
          <form onSubmit={handleJoinSubmit}>
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">Terima Undangan</CardTitle>
              <CardDescription>
                Anda diundang untuk bergabung ke organisasi berikut:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Gagal Bergabung</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="border-border/80 bg-muted/30 space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Organisasi</span>
                  <span className="text-foreground font-semibold">{decoded.orgName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Peran Anda</span>
                  <span className="text-foreground font-semibold capitalize">{decoded.role}</span>
                </div>
              </div>

              <div className="text-muted-foreground bg-accent/5 space-y-1 rounded-xl border border-dashed p-3 text-xs">
                <p>Anda saat ini masuk sebagai:</p>
                <p className="text-foreground text-sm font-semibold">{activeUser.email}</p>
                {isDifferentEmail && (
                  <p className="mt-1 font-medium text-amber-600">
                    *Catatan: Email ini berbeda dengan email tujuan undangan ({decoded.email}).
                  </p>
                )}
              </div>
            </CardContent>

            {/* CARD FOOTER DENGAN DUA TOMBOL: GABUNG DAN TOLAK */}
            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl font-medium">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Sedang Bergabung..." : "Terima Undangan & Gabung"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleDeclineInvite}
                disabled={isSubmitting}
                className="hover:bg-destructive/10 hover:text-destructive h-11 w-full rounded-xl border font-medium">
                Tolak Undangan
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
