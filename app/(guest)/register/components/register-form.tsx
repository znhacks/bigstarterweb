"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("guest.register");

  // Baca tujuan pengalihan berikutnya dari URL (?next=...)
  const nextTarget = searchParams.get("next");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);

  // Registrasi Menggunakan Email & Password
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAlreadyExists(false);

    const fullName = `${firstName} ${lastName}`.trim();

    try {
      // 1. Definisikan URL redirect dinamis setelah verifikasi email sukses
      const redirectUrl = nextTarget
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextTarget)}`
        : `${window.location.origin}/auth/callback`;

      // 2. Kirim signUp dengan opsi emailRedirectTo
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: redirectUrl
        }
      });

      if (authError) throw authError;

      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: fullName
        });

        // Tampilkan pesan sukses dan instruksi verifikasi dari translasi
        setSuccessMsg(t("successText"));
      }
    } catch (err: any) {
      if (err?.message && /already registered/i.test(err.message)) {
        setAlreadyExists(true);
      } else {
        setErrorMsg(err.message || t("errorDefault"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Registrasi & Login Menggunakan Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || t("errorGoogle"));
    }
  };

  return (
    <div className="grid gap-4">
      {/* Alert Error */}
      {errorMsg && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Alert Sukses */}
      {successMsg && (
        <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>{t("success")}</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Alert Akun Sudah Ada */}
      {alreadyExists && (
        <Alert className="rounded-xl border-amber-500/20 bg-amber-500/10 text-amber-600">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>{t("accountExistsTitle")}</AlertTitle>
          <AlertDescription>
            {t("accountExistsDesc")}{" "}
            <Link href="/login" className="font-semibold underline">
              {t("goToLogin")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleRegister} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="first_name">{t("firstName")}</Label>
          <Input
            id="first_name"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t("firstName")}
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="last_name">{t("lastName")}</Label>
          <Input
            id="last_name"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t("lastName")}
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="mt-2 h-10 w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("creatingAccount") : t("register")}
        </Button>
      </form>

      <div className="my-2">
        <div className="flex items-center gap-3">
          <div className="w-full border-t" />
          <span className="text-muted-foreground shrink-0 text-sm">{t("orContinueWith")}</span>
          <div className="w-full border-t" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Tombol Registrasi Google */}
        <Button
          variant="outline"
          type="button"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isLoading}>
          <svg viewBox="0 0 24 24" className="me-2 h-4 w-4">
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
          {t("google")}
        </Button>
        <Button variant="outline" type="button" className="w-full" disabled={isLoading}>
          <GitHubLogoIcon className="me-2 h-4 w-4" />
          {t("github")}
        </Button>
      </div>
    </div>
  );
}
