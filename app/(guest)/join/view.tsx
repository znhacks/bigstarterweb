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
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, Ban, XCircle, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";

interface DecodedToken {
  email: string;
  roleId: string;
  roleName: string;
  orgName: string;
}

export function JoinOrganization() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const t = useTranslations("guest.join");

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
        throw new Error(t("org-notfound", { orgname: decoded.orgName }));
      }

      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", activeUser.id)
        .eq("tenant_id", tenantData.id)
        .maybeSingle();

      if (existingMembership) {
        throw new Error(t("alreadyjoin", { orgname: decoded.orgName }));
      }

      // Ambil role_id dari BARIS INVITATION (sumber kebenaran), bukan dari token,
      // agar token yang dimanipulasi tidak bisa meningkatkan hak akses.
      const { data: inviteRow } = await supabase
        .from("invitations")
        .select("role_id, roles(name)")
        .eq("tenant_id", tenantData.id)
        .eq("email", decoded.email)
        .maybeSingle();

      const inv = inviteRow as any;
      if (!inv || !inv.role_id) {
        throw new Error(t("invalidinvite"));
      }

      // 1. Daftarkan user ke tabel memberships
      const { error: membershipError } = await supabase.from("memberships").insert({
        user_id: activeUser.id,
        tenant_id: tenantData.id,
        role_id: inv.role_id
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
      setErrorMsg(error.message || t("failedprocess"));
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
        throw new Error(t("org-notfound", { orgname: decoded.orgName }));
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
      setErrorMsg(error.message || t("failedreject"));
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
              <h2 className="text-foreground text-xl font-bold">{t("rejected.title")}</h2>
              <p className="text-muted-foreground mx-auto max-w-xs text-sm">
                {t("rejected.desc")} <strong>{decoded?.orgName}</strong>.
              </p>
            </div>
            <Button variant="outline" className="mt-2" onClick={() => router.push("/")}>
              {t("backhome")}
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
              <h2 className="text-foreground text-xl font-bold">{t("nonactive.title")}</h2>
              <p className="text-muted-foreground mx-auto max-w-xs text-sm">
                {t("nonactive.desc")}
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
      <Card className="w-full max-w-md overflow-hidden">
        {isSuccess ? (
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
            <CheckCircle2 className="h-16 w-16 animate-bounce text-emerald-600" />
            <div className="space-y-1">
              <CardTitle className="text-xl">{t("joined.title")}</CardTitle>
              <CardDescription>
                {t("joined.desc")} <strong>{decoded.orgName}</strong>.
              </CardDescription>
            </div>
            <p className="text-muted-foreground text-xs">{t("joined.loading")}</p>
          </CardContent>
        ) : (
          <form onSubmit={handleJoinSubmit}>
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">{t("title")}</CardTitle>
              <CardDescription>{t("desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("error.title")}</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="border-border/80 bg-muted/30 space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("org")}</span>
                  <span className="text-foreground font-semibold">{decoded.orgName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("your-role")}</span>
                  <span className="text-foreground font-semibold capitalize">
                    {decoded.roleName}
                  </span>
                </div>
              </div>
            </CardContent>

            {/* CARD FOOTER DENGAN DUA TOMBOL: GABUNG DAN TOLAK */}
            <CardFooter className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleDeclineInvite}
                disabled={isSubmitting}
                className="h-11 w-full sm:flex-1">
                <X className="h-4 w-4" />
                {t("reject")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-11 w-full sm:flex-1">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? t("loading") : t("accept")}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
