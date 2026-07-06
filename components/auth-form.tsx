// src/components/AuthForm.tsx
"use client";

import React, { useState } from "react";
import { AUTH_FEATURES } from "@/config/auth";
import { authService } from "@/services/auth";
import { useRouter } from "next/navigation";

type AuthTab = "PASSWORD" | "OTP" | "MAGIC_LINK";

export function AuthForm() {
  const router = useRouter();

  // Tentukan tab aktif pertama berdasarkan konfigurasi yang tersedia
  const defaultTab = AUTH_FEATURES.enablePassword
    ? "PASSWORD"
    : AUTH_FEATURES.enablePasswordlessOtp
      ? "OTP"
      : "MAGIC_LINK";

  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [step, setStep] = useState<"INPUT" | "VERIFY_OTP">("INPUT");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (activeTab === "PASSWORD") {
        if (isSignUp) {
          const { error } = await authService.signUpWithPassword(email, password);
          if (error) throw error;
          setMessage("Registrasi berhasil. Silakan cek email Anda untuk konfirmasi.");
        } else {
          const { error } = await authService.signInWithPassword(email, password);
          if (error) throw error;
          router.push("/dashboard");
        }
      } else if (activeTab === "OTP") {
        const { error } = await authService.sendPasswordlessAccess(email, false);
        if (error) throw error;
        setStep("VERIFY_OTP");
        setMessage("Kode verifikasi OTP telah dikirim ke email Anda.");
      } else if (activeTab === "MAGIC_LINK") {
        const { error } = await authService.sendPasswordlessAccess(email, true);
        if (error) throw error;
        setMessage("Link login telah dikirim ke email Anda.");
      }
    } catch (err: any) {
      setMessage(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await authService.verifyOtp(email, otpToken);
      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      setMessage(err.message || "Kode OTP tidak valid atau kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded border bg-white p-6 text-black shadow-md">
      <h2 className="mb-4 text-center text-xl font-bold">
        {step === "VERIFY_OTP" ? "Verifikasi Kode" : isSignUp ? "Daftar Akun" : "Masuk"}
      </h2>

      {message && <p className="mb-4 text-center text-sm font-medium text-blue-600">{message}</p>}

      {step === "INPUT" ? (
        <>
          {/* Navigasi Tab Pilihan Metode */}
          <div className="mb-6 flex border-b">
            {AUTH_FEATURES.enablePassword && (
              <button
                type="button"
                className={`flex-1 pb-2 text-sm ${activeTab === "PASSWORD" ? "border-b-2 border-blue-600 font-bold" : "text-gray-400"}`}
                onClick={() => setActiveTab("PASSWORD")}>
                Password
              </button>
            )}
            {AUTH_FEATURES.enablePasswordlessOtp && (
              <button
                type="button"
                className={`flex-1 pb-2 text-sm ${activeTab === "OTP" ? "border-b-2 border-blue-600 font-bold" : "text-gray-400"}`}
                onClick={() => setActiveTab("OTP")}>
                OTP Email
              </button>
            )}
            {AUTH_FEATURES.enableMagicLink && (
              <button
                type="button"
                className={`flex-1 pb-2 text-sm ${activeTab === "MAGIC_LINK" ? "border-b-2 border-blue-600 font-bold" : "text-gray-400"}`}
                onClick={() => setActiveTab("MAGIC_LINK")}>
                Magic Link
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="w-full rounded border p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
              />
            </div>

            {activeTab === "PASSWORD" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  className="w-full rounded border p-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 p-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
              {loading
                ? "Memproses..."
                : activeTab === "PASSWORD"
                  ? isSignUp
                    ? "Daftar"
                    : "Masuk"
                  : "Kirim Akses"}
            </button>
          </form>

          {activeTab === "PASSWORD" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-xs text-blue-500 underline"
                onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
              </button>
            </div>
          )}

          {/* Opsi Login Google */}
          {AUTH_FEATURES.enableGoogle && (
            <div className="mt-6 border-t pt-4">
              <button
                type="button"
                onClick={() => authService.signInWithGoogle()}
                className="flex w-full items-center justify-center gap-2 rounded border p-2 transition-colors hover:bg-gray-50">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.97 1 12 1 7.35 1 3.4 3.65 1.51 7.5l3.86 3C6.28 7.52 8.92 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.44-1.1 2.66-2.33 3.48l3.63 2.82c2.13-1.97 3.73-4.87 3.73-8.4z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.37 14.5c-.24-.72-.37-1.49-.37-2.3s.13-1.58.37-2.3L1.51 6.9C.54 8.84 0 11.02 0 13.3c0 2.28.54 4.46 1.51 6.4l3.86-3.2z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.63-2.82c-1.01.68-2.3 1.09-4.33 1.09-3.08 0-5.72-2.48-6.63-5.46l-3.86 3C3.4 20.35 7.35 23 12 23z"
                  />
                </svg>
                <span className="text-sm font-medium">Lanjutkan dengan Google</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Form Masukan Kode OTP */
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="mb-2 block text-center text-sm font-medium">
              Masukkan 6 Digit OTP
            </label>
            <input
              type="text"
              required
              maxLength={6}
              className="w-full rounded border p-2 text-center font-mono text-lg tracking-widest"
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value)}
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-green-600 p-2 font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? "Memverifikasi..." : "Verifikasi"}
          </button>

          <button
            type="button"
            className="mt-2 block w-full text-center text-xs text-gray-500 hover:underline"
            onClick={() => setStep("INPUT")}>
            Kembali
          </button>
        </form>
      )}
    </div>
  );
}
