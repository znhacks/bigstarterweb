import React from "react";
import { requireAuth } from "@/lib/auth";
import { CreateTenantForm } from "@/components/create-tenant-form";

export default async function CreateTenantPage() {
  // Wajibkan autentikasi sesi sebelum masuk halaman ini
  await requireAuth();

  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Satu langkah lagi!</h1>
          <p className="text-muted-foreground text-sm">
            Aplikasi mendeteksi Anda belum tergabung di organisasi mana pun. Silakan buat organisasi
            pertama Anda.
          </p>
        </div>
        <CreateTenantForm />
      </div>
    </div>
  );
}
