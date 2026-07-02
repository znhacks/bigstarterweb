"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./login-form";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function DemoSandbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRedirect = (user: any) => {
    // Memeriksa role dari user_metadata atau app_metadata
    const isSuperAdmin =
      user?.app_metadata?.role === "superadmin" ||
      user?.user_metadata?.role === "superadmin" ||
      user?.email === "superadmin@example.com";

    if (isSuperAdmin) {
      router.push("/superadmin/dashboard");
    } else {
      router.push(nextTarget || "/");
    }
    router.refresh();
  };

  const handleQuickSuperadminLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const dummyEmail = "superadmin@example.com";
    const dummyPassword = "superadmin123";

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: dummyPassword
      });

      if (error) {
        throw new Error(
          "Akun demo belum terdaftar. Pastikan pengguna 'superadmin@example.com' sudah dibuat di dashboard Supabase Anda."
        );
      }

      if (data.user) {
        setSuccessMsg("Login Superadmin berhasil! Mengalihkan...");
        setTimeout(() => {
          handleRedirect(data.user);
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-500">
        <ShieldAlert className="h-4 w-4" />
        <span className="text-xs font-semibold">Demo Sandbox Mode</span>
      </div>

      <p className="text-muted-foreground mb-3 text-[11px] leading-relaxed">
        Gunakan tombol di bawah untuk masuk otomatis menggunakan akun demonstrasi superadmin.
      </p>

      <Button
        variant="outline"
        onClick={handleQuickSuperadminLogin}
        disabled={isLoading}
        className="h-8 w-full">
        {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Quick Login: Superadmin
      </Button>
    </div>
  );
}
