"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyIcon,
  ShieldAlert,
  Eye,
  EyeOff
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/i18n/format";
import { OtpLoginForm } from "@/components/auth/otp-login";

import { profileRepository } from "@/supabase/repositories/profiles";
import { AUTH_FEATURES, hasSocialAuth } from "@/config/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next");
  const reason = searchParams.get("reason");

  const defaultTab = AUTH_FEATURES.enablePassword
    ? "password"
    : AUTH_FEATURES.enableMagicLink
      ? "magic"
      : AUTH_FEATURES.enablePasswordlessOtp
        ? "otp"
        : "password";

  const [bannedInfo, setBannedInfo] = useState<{
    until: string | null;
    reason: string | null;
  } | null>(null);

  useEffect(() => {
    if (reason !== "banned") return;
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const profiles = await profileRepository(supabase);
      const { data } = await profiles
        .query()
        .select("banned_until, banned_reason")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setBannedInfo({
          until: (data as any).banned_until,
          reason: (data as any).banned_reason
        });
      }
    })();
  }, [reason]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const locale = useLocale();
  const t = useTranslations("guest.login");

  // Routing pasca-login TIDAK lagi menebak superadmin di sisi client.
  // Semua user (superadmin maupun biasa) dilepas ke `/` (atau nextTarget),
  // dan root page `/` yang menjadi otoritas routing berbasis profiles.is_superadmin.
  // Lihat app/page.tsx.
  const handleRedirect = () => {
    router.push(nextTarget || "/");
    router.refresh();
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        setSuccessMsg(t("logsucces"));
        setTimeout(() => {
          handleRedirect();
        }, 1000);
      }
    } catch (err: any) {
      // Fallback: Jika Client Fetch gagal (CORS, Adblocker, atau masalah Env di Vercel), panggil Server Action
      if (err.message?.includes("Failed to fetch") || err.name === "TypeError" || !err.status) {
        try {
          const { loginAction } = await import("@/app/actions/auth");
          const serverRes = await loginAction({ email, password });
          if (serverRes.error) {
            setErrorMsg(serverRes.error);
          } else {
            setSuccessMsg(t("logsucces"));
            setTimeout(() => {
              handleRedirect();
            }, 1000);
          }
          return;
        } catch (serverErr: any) {
          setErrorMsg(serverErr.message || t("wronginput"));
          return;
        }
      }
      setErrorMsg(err.message || t("wronginput"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const redirectUrl = nextTarget
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextTarget)}`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      setSuccessMsg(t("sendmailsuccess"));
      setEmail("");
    } catch (err: any) {
      setErrorMsg(err.message || t("sendmailfailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : ""}`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || t("googlefailed"));
      setIsLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : ""}`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || t("githubfailed"));
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPasskey();

      if (error) throw error;

      if (data?.user) {
        setSuccessMsg(t("passkeysuccess"));
        setTimeout(() => {
          handleRedirect();
        }, 1000);
      }
    } catch (err: any) {
      const rawMessage = err.message || "";

      if (
        rawMessage.includes("timed out") ||
        rawMessage.includes("not allowed") ||
        rawMessage.includes("WebAuthn") ||
        rawMessage.includes("privacy-considerations")
      ) {
        setErrorMsg(null);
      } else {
        setErrorMsg(rawMessage || t("passkeyfailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-5">
      {}
      {errorMsg && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>{t("success")}</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {reason === "deleted" && (
        <Alert className="rounded-xl border-amber-500/20 bg-amber-500/10 text-amber-600">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle>{t("deleted.title")}</AlertTitle>
          <AlertDescription>{t("deleted.desc")}</AlertDescription>
        </Alert>
      )}

      {reason === "banned" && (
        <Alert variant="destructive" className="rounded-xl">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t("banned.title")}</AlertTitle>
          <AlertDescription>
            {t("banned.desc")}

            {bannedInfo?.reason && (
              <span className="block">
                {t("banned.reason")}: {bannedInfo.reason}
              </span>
            )}

            {bannedInfo?.until && (
              <span className="block">
                {t("banned.until")}:{" "}
                {formatDateTime(bannedInfo.until, locale, {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-4 h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
          {AUTH_FEATURES.enablePassword && (
            <TabsTrigger
              value="password"
              className="data-[state=active]:border-b-foreground rounded-none border-b-2 border-b-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:shadow-none">
              {t("password")}
            </TabsTrigger>
          )}
          {AUTH_FEATURES.enableMagicLink && (
            <TabsTrigger
              value="magic"
              className="data-[state=active]:border-b-foreground rounded-none border-b-2 border-b-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:shadow-none">
              {t("magiclink")}
            </TabsTrigger>
          )}
          {AUTH_FEATURES.enablePasswordlessOtp && (
            <TabsTrigger
              value="otp"
              className="data-[state=active]:border-b-foreground rounded-none border-b-2 border-b-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:shadow-none">
              {t("otp")}
            </TabsTrigger>
          )}
        </TabsList>

        {}
        {AUTH_FEATURES.enablePasswordlessOtp && (
          <TabsContent value="otp" className="mt-0 focus-visible:outline-none">
            <OtpLoginForm />
          </TabsContent>
        )}

        {}
        <TabsContent value="password" className="mt-0 focus-visible:outline-none">
          <form onSubmit={handlePasswordLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email-password">{t("email")}</Label>
              <Input
                id="email-password"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-border/80 h-10"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">{t("password")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground ml-auto inline-block text-xs hover:underline">
                  {t("forgotpassword")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-border/80 h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-foreground/90 mt-1 h-10 w-full font-medium"
              disabled={isLoading}>
              {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("title")}
            </Button>
          </form>
        </TabsContent>

        {}
        <TabsContent value="magic" className="mt-0 focus-visible:outline-none">
          <form onSubmit={handleMagicLinkLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email-magic">{t("email")}</Label>
              <Input
                id="email-magic"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-border/80 h-10"
              />
            </div>
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-foreground/90 mt-1 h-10 w-full font-medium"
              disabled={isLoading || !email.trim()}>
              {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("sendmagiclink")}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {}
      {hasSocialAuth && (
        <div className="my-1">
          <div className="flex items-center gap-3">
            <div className="border-border/60 w-full border-t" />
            <span className="text-muted-foreground shrink-0 text-xs">{t("continuewith")}</span>
            <div className="border-border/60 w-full border-t" />
          </div>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 gap-3">
        {AUTH_FEATURES.enableGoogle && (
          <Button
            variant="outline"
            type="button"
            className="h-10 w-full text-xs font-semibold"
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
            Google
          </Button>
        )}
        {AUTH_FEATURES.enableGithub && (
          <Button
            variant="outline"
            type="button"
            className="h-10 w-full text-xs font-semibold"
            onClick={handleGitHubSignIn}
            disabled={isLoading}>
            <GitHubLogoIcon className="me-2 h-4 w-4" />
            GitHub
          </Button>
        )}
      </div>

      {}
      {AUTH_FEATURES.enablePasskey && (
        <Button
          variant="secondary"
          type="button"
          className="bg-secondary/80 text-foreground h-10 w-full text-xs font-semibold"
          onClick={handlePasskeyLogin}
          disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyIcon className="me-2 h-4 w-4" />
          )}
          {t("withpasskey")}
        </Button>
      )}
    </div>
  );
}
