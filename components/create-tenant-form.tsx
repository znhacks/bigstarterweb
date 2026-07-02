"use client";

import React, { useState } from "react";
import { createTenant } from "@/app/actions/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CreateTenantForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const result = await createTenant(formData);

    // Jika terjadi error, matikan status loading dan tampilkan pesannya
    if (result?.error) {
      setErrorMsg(result.error);
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMsg && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nama Organisasi</Label>
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
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Buat
      </Button>
    </form>
  );
}
