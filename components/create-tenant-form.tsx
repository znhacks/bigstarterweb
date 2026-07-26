"use client";

import React, { useState } from "react";
import { createTenant } from "@/app/actions/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

export function CreateTenantForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("guest.create-tenant");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createTenant(formData);

      // 1. Tangani jika ada pesan error dari Server Action
      if (result?.error) {
        setErrorMsg(result.error);
        setIsLoading(false);
        return;
      }

      // 2. Tangani jika diminta redirect ke halaman Login
      if (result?.redirect) {
        window.location.href = result.redirect;
        return;
      }

      // 3. Tangani jika pendaftaran sukses
      if (result?.success && result?.slug) {
        // Melakukan full-reload redirect ke dashboard agar cookie active_tenant_id
        // langsung terkirim dan dibaca dengan benar oleh middleware/layout di server.
        window.location.href = `/${result.slug}/dashboard`;
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

      <div className="space-y-2">
        <Label htmlFor="name">{t("org-name")}</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Contoh: Studio Tengah Malam"
          required
          disabled={isLoading}
          className="border-border/80 h-10"
        />
      </div>

      <Button type="submit" className="mt-2 h-10 w-full font-medium" disabled={isLoading}>
        {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {t("create")}
      </Button>
    </form>
  );
}
