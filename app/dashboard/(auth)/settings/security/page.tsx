"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Smartphone,
  ShieldCheck,
  Laptop,
  Check
} from "lucide-react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Impor klien Supabase & Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

// 1. KAMUS TERJEMAHAN KHUSUS HALAMAN SECURITY
const securityTranslations = {
  English: {
    title: "Security settings",
    subTitle: "Manage your account security, passwords, and active sessions.",
    password: {
      title: "Your password",
      desc: "You have not set a password yet. To set one, you need to go through the password reset flow. Click the button below to send an email to reset your password.",
      btn: "Set password"
    },
    oauth: {
      title: "Connected accounts",
      connected: "Connected",
      connect: "Connect"
    },
    passkey: {
      title: "Passkeys",
      desc: "Use passkeys as a secure alternative to passwords.",
      btn: "+ Add passkey"
    },
    tfa: {
      title: "Two-factor authentication",
      desc: "Add an extra layer of security to your account.",
      warning:
        "Password required. Set a password before enabling two-factor authentication. Your password is required to verify changes to this security setting.",
      btn: "Enable two-factor authentication"
    },
    sessions: {
      title: "Active sessions",
      desc: "These are all the active sessions of your account. Click the X to end a specific session.",
      current: "Current session",
      btnTerm: "Terminate other sessions"
    }
  },
  "Bahasa Indonesia": {
    title: "Pengaturan Keamanan",
    subTitle: "Kelola keamanan akun, kata sandi, dan sesi aktif Anda.",
    password: {
      title: "Kata sandi Anda",
      desc: "Anda belum menyetel kata sandi. Untuk menyetelnya, Anda perlu melalui alur penyetelan ulang kata sandi. Klik tombol di bawah untuk mengirim email penyetelan.",
      btn: "Setel kata sandi"
    },
    oauth: {
      title: "Akun terhubung",
      connected: "Terhubung",
      connect: "Hubungkan"
    },
    passkey: {
      title: "Kunci Akses (Passkeys)",
      desc: "Gunakan kunci akses (passkey) sebagai alternatif masuk yang aman dibanding kata sandi biasa.",
      btn: "+ Tambah passkey"
    },
    tfa: {
      title: "Autentikasi dua faktor (2FA)",
      desc: "Tambahkan lapisan keamanan ekstra ke akun Anda.",
      warning:
        "Membutuhkan kata sandi. Setel kata sandi terlebih dahulu sebelum mengaktifkan autentikasi dua faktor. Kata sandi diperlukan untuk memverifikasi perubahan.",
      btn: "Aktifkan autentikasi dua faktor"
    },
    sessions: {
      title: "Sesi aktif",
      desc: "Ini adalah semua sesi masuk aktif dari akun Anda. Klik tanda X untuk mengakhiri sesi tertentu.",
      current: "Sesi saat ini",
      btnTerm: "Akhiri sesi perangkat lain"
    }
  }
};

export default function AccountSecuritySettings() {
  const router = useRouter();
  const { language } = useLanguage();

  // Membaca kamus terjemahan aktif
  const t = securityTranslations[language] || securityTranslations["English"];

  // State data dari Supabase
  const [email, setEmail] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [userAgent, setUserAgent] = useState("");

  // State loading & interaksi
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  useEffect(() => {
    // Deteksi User Agent Browser lokal
    if (typeof window !== "undefined") {
      setUserAgent(window.navigator.userAgent);
    }

    const loadSecurityData = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();
        if (error || !user) {
          router.push("/dashboard/login/v2");
          return;
        }

        setEmail(user.email || "");
        setProviders(user.app_metadata?.providers || []);
      } catch (err) {
        console.error("Gagal memuat data keamanan:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecurityData();
  }, [router]);

  // Efek auto-dismiss alert
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Handler Kirim Email Reset / Setel Password Nyata via Supabase Auth
  const handleSetPassword = async () => {
    if (!email) return;
    setIsSendingReset(true);
    setAlertMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/forgot-password` // Ganti ke URL reset password Anda jika ada
      });

      if (error) throw error;

      setAlertMessage({
        title: language === "English" ? "Email Sent" : "Email Terkirim",
        description:
          language === "English"
            ? "We have sent a password reset link to your email."
            : "Kami telah sukses mengirimkan tautan penyetelan kata sandi baru ke inbox email Anda.",
        variant: "default"
      });
    } catch (e: any) {
      setAlertMessage({
        title: "Error",
        description: e.message || "Gagal memproses pengiriman email reset.",
        variant: "destructive"
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  // Handler Hentikan Sesi di Perangkat Lain via Supabase
  const handleTerminateOtherSessions = async () => {
    setIsTerminating(true);
    setAlertMessage(null);

    try {
      // Mengeluarkan semua sesi di perangkat lain kecuali perangkat saat ini
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;

      setAlertMessage({
        title: language === "English" ? "Sessions Terminated" : "Sesi Diakhiri",
        description:
          language === "English"
            ? "Successfully signed out of all other devices."
            : "Sesi aktif di perangkat lain berhasil dihentikan secara aman.",
        variant: "default"
      });
    } catch (e: any) {
      setAlertMessage({
        title: "Error",
        description: e.message || "Gagal mengakhiri sesi lain.",
        variant: "destructive"
      });
    } finally {
      setIsTerminating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      {/* Header Halaman */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.subTitle}</p>
      </div>

      {/* SHADCN ALERT NOTIFICATION */}
      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pr-10">
          {alertMessage.variant === "destructive" ? (
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div className="space-y-1">
            <AlertTitle className="font-semibold">{alertMessage.title}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {alertMessage.description}
            </AlertDescription>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      <div className="space-y-6">
        {/* CARD 1: YOUR PASSWORD */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="space-y-1 md:max-w-xl">
              <h2 className="text-foreground text-base font-semibold">{t.password.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t.password.desc}</p>
            </div>

            <div className="flex shrink-0">
              <Button
                onClick={handleSetPassword}
                disabled={isSendingReset}
                variant="outline"
                className="border-border/80 inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold">
                {isSendingReset ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {t.password.btn}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: CONNECTED ACCOUNTS */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="space-y-6 p-8">
            <h2 className="text-foreground text-base font-semibold">{t.oauth.title}</h2>

            <div className="max-w-2xl space-y-4">
              {/* OAUTH 1: GOOGLE */}
              <div className="border-border/60 flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-sm font-semibold">Google</span>
                </div>
                {providers.includes("google") ? (
                  <Badge className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10">
                    <Check className="h-3 w-3" /> {t.oauth.connected}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border/85 h-8 rounded-lg px-4 text-xs font-semibold">
                    {t.oauth.connect}
                  </Button>
                )}
              </div>

              {/* OAUTH 2: GITHUB */}
              <div className="border-border/60 flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <GitHubLogoIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold">GitHub</span>
                </div>
                {providers.includes("github") ? (
                  <Badge className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10">
                    <Check className="h-3 w-3" /> {t.oauth.connected}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border/85 h-8 rounded-lg px-4 text-xs font-semibold">
                    {t.oauth.connect}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: PASSKEYS */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="space-y-1 md:max-w-md">
              <h2 className="text-foreground text-base font-semibold">{t.passkey.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t.passkey.desc}</p>
            </div>

            <div className="flex shrink-0">
              <Button
                variant="outline"
                className="border-border/80 h-10 rounded-xl px-5 text-sm font-semibold">
                {t.passkey.btn}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: TWO-FACTOR AUTHENTICATION */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-1">
              <h2 className="text-foreground text-base font-semibold">{t.tfa.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t.tfa.desc}</p>
            </div>

            {/* Warning Alert 2FA */}
            <Alert className="flex max-w-4xl gap-3 rounded-2xl border-amber-500/20 bg-amber-500/5 p-4 text-amber-600">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <AlertTitle className="text-sm font-semibold">Password Required</AlertTitle>
                <AlertDescription className="text-muted-foreground text-xs leading-relaxed">
                  {t.tfa.warning}
                </AlertDescription>
              </div>
            </Alert>

            <Button
              disabled
              variant="outline"
              className="h-10 rounded-xl px-5 text-sm font-semibold">
              {t.tfa.btn}
            </Button>
          </CardContent>
        </Card>

        {/* CARD 5: ACTIVE SESSIONS */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-1">
              <h2 className="text-foreground text-base font-semibold">{t.sessions.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t.sessions.desc}</p>
            </div>

            <div className="max-w-4xl space-y-4">
              {/* Sesi browser saat ini */}
              <div className="border-border/60 bg-card flex items-start justify-between gap-4 rounded-xl border p-5">
                <div className="flex items-start gap-3.5">
                  <div className="bg-muted border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                    <Laptop className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground truncate text-sm font-semibold">
                        {t.sessions.current}
                      </span>
                      <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10">
                        ACTIVE
                      </Badge>
                    </div>
                    <span className="text-muted-foreground font-mono text-xs leading-relaxed break-all">
                      {userAgent || "Loading browser details..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tombol Hentikan Sesi Lain */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleTerminateOtherSessions}
                  disabled={isTerminating}
                  variant="outline"
                  className="border-border/80 inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-sm font-semibold">
                  {isTerminating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t.sessions.btnTerm}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
