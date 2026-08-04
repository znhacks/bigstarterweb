"use client";

import React, { useState } from "react";
import { setupRegistrationTenant, createTenant } from "@/app/actions/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Building2, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

export function CreateTenantForm() {
  const [regType, setRegType] = useState<"create" | "join">("create");
  const [orgName, setOrgName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("guest.create-tenant");
  const tReg = useTranslations("guest.register");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (regType === "create") {
        if (!orgName || orgName.trim().length < 2) {
          setErrorMsg(tReg("orgNameRequired"));
          setIsLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("name", orgName.trim());
        const result = await createTenant(formData);

        if (result?.error) {
          setErrorMsg(result.error);
          setIsLoading(false);
          return;
        }

        if (result?.redirect) {
          window.location.href = result.redirect;
          return;
        }

        if (result?.success && result?.slug) {
          window.location.href = `/${result.slug}/dashboard`;
        }
      } else {
        if (!inviteCode || !inviteCode.trim()) {
          setErrorMsg(tReg("inviteCodeRequired"));
          setIsLoading(false);
          return;
        }

        const result = await setupRegistrationTenant({
          regType: "join",
          inviteCode
        });

        if (result?.error) {
          setErrorMsg(result.error);
          setIsLoading(false);
          return;
        }

        if (result?.success && result?.tenantSlug) {
          window.location.href = `/${result.tenantSlug}/dashboard`;
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan sistem. Silakan coba lagi.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMsg && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.title")}</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Switcher Tipe Pendaftaran Organisasi */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {tReg("registrationType")}
        </Label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setRegType("create")}
            className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
              regType === "create"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Building2 className="h-3.5 w-3.5" />
            <span>{tReg("optionCreateOrg")}</span>
          </button>
          <button
            type="button"
            onClick={() => setRegType("join")}
            className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${
              regType === "join"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <UserPlus className="h-3.5 w-3.5" />
            <span>{tReg("optionJoinOrg")}</span>
          </button>
        </div>
      </div>

      {regType === "create" ? (
        <div className="space-y-2">
          <Label htmlFor="name">{t("org-name")}</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Contoh: Studio Tengah Malam"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
            disabled={isLoading}
            className="border-border/80 h-10"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="invite_code">{tReg("inviteCode")}</Label>
          <Input
            id="invite_code"
            name="invite_code"
            type="text"
            placeholder={tReg("inviteCodePlaceholder")}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            disabled={isLoading}
            className="border-border/80 h-10"
          />
        </div>
      )}

      <Button type="submit" className="mt-2 h-10 w-full font-medium" disabled={isLoading}>
        {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {regType === "create" ? t("create") : tReg("optionJoinOrg")}
      </Button>
    </form>
  );
}
