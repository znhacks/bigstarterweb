"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AUTH_FEATURES } from "@/config/auth";

export default function MagicLoginHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const next = searchParams.get("next") ?? "/dashboard/default";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const processMagicLogin = async () => {
      if (!AUTH_FEATURES.enableMagicLink) {
        router.replace("/login");
        return;
      }
      if (!token) {
        setStatus("error");
        setErrorMsg("Token autentikasi tidak ditemukan.");
        return;
      }

      try {
        // 1. Dekripsi data token Base64
        const decodedString = Buffer.from(token, "base64").toString("utf-8");
        const { email, timestamp } = JSON.parse(decodedString);

        // Validasi kadaluarsa token lokal (misal: maksimal 15 menit)
        if (Date.now() - timestamp > 15 * 60 * 1000) {
          throw new Error("Tautan ajaib telah kadaluarsa. Silakan buat tautan baru.");
        }

        // 2. Lakukan login instan menggunakan passwordless otp di sisi client
        const { error } = await supabase.auth.signInWithOtp({ email });

        if (error) throw error;

        setStatus("success");

        // Alihkan halaman setelah sukses
        setTimeout(() => {
          router.push(next);
          router.refresh();
        }, 1500);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Gagal masuk menggunakan Magic Link.");
      }
    };

    processMagicLogin();
  }, [token, next, router]);

  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Card className="border-border/80 w-full max-w-md rounded-2xl border py-12 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="text-primary h-12 w-12 animate-spin" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Memverifikasi Akses</h2>
                <p className="text-muted-foreground text-sm">
                  Mohon tunggu, kami sedang menyelaraskan sesi masuk Anda...
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 animate-bounce text-emerald-600" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-emerald-600">Verifikasi Sukses</h2>
                <p className="text-muted-foreground text-sm">
                  Sesi terhubung. Mengalihkan Anda ke dashboard...
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-destructive text-lg font-semibold">Gagal Masuk</h2>
                <p className="text-muted-foreground text-sm">{errorMsg}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
