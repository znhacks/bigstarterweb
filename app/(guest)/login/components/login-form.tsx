"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Loader2, KeyIcon } from "lucide-react";

// Impor klien Supabase Anda
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next");

  // State Input
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // State Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Handler Login dengan Password Tradisional
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
        setSuccessMsg("Login berhasil! Mengalihkan halaman...");
        setTimeout(() => {
          router.push(nextTarget || "/dashboard/default");
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Email atau password salah.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handler Login dengan Magic Link (OTP Email)
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

      setSuccessMsg(
        "Tautan akses (Magic Link) berhasil dikirim! Silakan periksa inbox email Anda."
      );
      setEmail("");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengirimkan Magic Link. Coba kembali.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handler OAuth Google
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk menggunakan Google.");
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-5">
      {/* Alert Notifikasi */}
      {errorMsg && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* TABS CONTROLLER */}
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="border-border/60 mb-4 h-auto w-full justify-start space-x-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="password"
            className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
            Password
          </TabsTrigger>
          <TabsTrigger
            value="magic"
            className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
            Magic link
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 CONTENT: PASSWORD */}
        <TabsContent value="password" className="mt-0 focus-visible:outline-none">
          <form onSubmit={handlePasswordLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email-password">Email</Label>
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
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground ml-auto inline-block text-xs hover:underline">
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="border-border/80 h-10"
              />
            </div>
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-foreground/90 mt-1 h-10 w-full font-medium"
              disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </TabsContent>

        {/* TAB 2 CONTENT: MAGIC LINK */}
        <TabsContent value="magic" className="mt-0 focus-visible:outline-none">
          <form onSubmit={handleMagicLinkLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email-magic">Email</Label>
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
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send magic link
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* CONTINUATOR DIVIDER */}
      <div className="my-1">
        <div className="flex items-center gap-3">
          <div className="border-border/60 w-full border-t" />
          <span className="text-muted-foreground shrink-0 text-xs">Or continue with</span>
          <div className="border-border/60 w-full border-t" />
        </div>
      </div>

      {/* OAUTH BUTTONS */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          type="button"
          className="h-10 w-full text-xs font-semibold"
          onClick={handleGoogleSignIn}
          disabled={isLoading}>
          <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4">
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
        <Button
          variant="outline"
          type="button"
          className="h-10 w-full text-xs font-semibold"
          disabled={isLoading}>
          <GitHubLogoIcon className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </div>

      {/* PASSKEY MOCKUP */}
      <Button
        variant="secondary"
        type="button"
        className="bg-secondary/80 text-foreground h-10 w-full text-xs font-semibold"
        disabled={isLoading}>
        <KeyIcon className="mr-2 h-4 w-4" />
        Log in with passkey
      </Button>
    </div>
  );
}
