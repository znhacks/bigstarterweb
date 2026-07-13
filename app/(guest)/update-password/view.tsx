"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, EyeOff, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { useTranslations } from "next-intl";

export function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const t = useTranslations("guest.update-password");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setErrorMsg(t("passwordlength"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t("confirmpassword"));
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Mengubah/memperbarui password user aktif secara nyata di Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: password.trim()
      });

      if (error) throw error;

      setIsSuccess(true);

      // Alihkan ke dashboard utama setelah 2 detik
      setTimeout(() => {
        router.push("/dashboard/default");
        router.refresh();
      }, 2000);
    } catch (error: any) {
      setErrorMsg(error.message || t("failedupdate"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {isSuccess ? (
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
            <CheckCircle2 className="h-16 w-16 animate-bounce text-emerald-600" />
            <div className="space-y-1">
              <CardTitle className="text-xl">{t("success.title")}</CardTitle>
              <CardDescription>{t("success.desc")}</CardDescription>
            </div>
            <p className="text-muted-foreground text-xs">{t("success.loading")}</p>
          </CardContent>
        ) : (
          <form onSubmit={handleUpdatePassword}>
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">{t("title")}</CardTitle>
              <CardDescription>{t("desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alert Error */}
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("error.failedsave")}</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">{t("newpassword")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={t("placeholder.newpassword")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("confirmpassword")}</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={t("placeholder.confirmpassword")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="inline-flex h-10 w-full items-center justify-center gap-2 font-medium">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? t("saving") : t("save")}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
