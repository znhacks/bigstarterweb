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
import { peekInviteToken } from "@/lib/invite/token-client";
import { acceptInvitation, declineInvitation } from "./actions";
import { useTranslations } from "next-intl";

export function JoinOrganization() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const t = useTranslations("guest.join");

  const [peek, setPeek] = useState<{ o: string; r: string } | null>(null);
  const [activeUser, setActiveUser] = useState<any>(null);

  const [isInviteValid, setIsInviteValid] = useState<boolean | null>(null);

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveUser = async () => {
      setIsLoadingUser(true);

      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        setActiveUser(user);
      }

      const decoded = peekInviteToken(token);
      if (!decoded) {
        setIsInviteValid(false);
      } else {
        setPeek({ o: decoded.o, r: decoded.r });
        setIsInviteValid(true);
      }

      setIsLoadingUser(false);
    };

    checkActiveUser();
  }, [token]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !token) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await acceptInvitation(token);

    if (!res.ok) {
      const codeMap: Record<string, string> = {
        auth: t("failedprocess"),
        invalid: t("invalidinvite"),
        email_mismatch: t("invalidinvite"),
        failed: t("failedprocess")
      };
      setErrorMsg(codeMap[res.code] || t("failedprocess"));
      setIsSubmitting(false);
      return;
    }

    localStorage.setItem("active_org_id", res.id);
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `active_tenant_id=${res.id}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

    setIsSuccess(true);

    setTimeout(() => {
      router.push(`/${res.slug}`);
      router.refresh();
    }, 2000);
  };

  const handleDeclineInvite = async () => {
    if (!activeUser || !token) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await declineInvitation(token);

    if (!res.ok) {
      setErrorMsg(t("failedreject"));
      setIsSubmitting(false);
      return;
    }

    setIsDeclined(true);
    setIsSubmitting(false);
  };

  if (isLoadingUser) {
    return (
      <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                {t("rejected.desc")} <strong>{peek?.o}</strong>.
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

  if (isInviteValid === false || !peek || !activeUser) {
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

  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {isSuccess ? (
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
            <CheckCircle2 className="h-16 w-16 animate-bounce text-emerald-600" />
            <div className="space-y-1">
              <CardTitle className="text-xl">{t("joined.title")}</CardTitle>
              <CardDescription>
                {t("joined.desc")} <strong>{peek.o}</strong>.
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
                  <span className="text-foreground font-semibold">{peek.o}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("your-role")}</span>
                  <span className="text-foreground font-semibold capitalize">{peek.r}</span>
                </div>
              </div>
            </CardContent>

            {}
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
