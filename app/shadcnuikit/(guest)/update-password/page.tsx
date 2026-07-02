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
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setErrorMsg("Kata sandi minimal harus terdiri dari 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
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
      setErrorMsg(error.message || "Gagal memperbarui kata sandi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Card className="border-border/80 w-full max-w-md overflow-hidden rounded-2xl border shadow-lg">
        {isSuccess ? (
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
            <CheckCircle2 className="h-16 w-16 animate-bounce text-emerald-600" />
            <div className="space-y-1">
              <CardTitle className="text-xl">Kata Sandi Diperbarui!</CardTitle>
              <CardDescription>Kata sandi baru Anda sukses disimpan.</CardDescription>
            </div>
            <p className="text-muted-foreground text-xs">Mengarahkan Anda ke halaman utama...</p>
          </CardContent>
        ) : (
          <form onSubmit={handleUpdatePassword}>
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">Setel Sandi Baru</CardTitle>
              <CardDescription>
                Silakan ketik kata sandi baru Anda yang aman di bawah ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alert Error */}
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Gagal Menyimpan</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">Kata Sandi Baru</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Min. 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Konfirmasi Kata Sandi</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="Ketik ulang kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl font-medium">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Saving..." : "Simpan Sandi Baru"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
