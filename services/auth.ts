// src/services/auth.ts;

import { supabase } from "@/lib/supabase";

export const authService = {
  // 1. Pendaftaran dengan Password
  signUpWithPassword: async (email: string, password: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
  },

  // 2. Masuk dengan Password
  signInWithPassword: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  // 3. Masuk/Daftar Tanpa Password (OTP & Magic Link)
  sendPasswordlessAccess: async (email: string, isMagicLink: boolean = false) => {
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Otomatis mendaftarkan jika email belum terdaftar
        emailRedirectTo: isMagicLink ? `${window.location.origin}/auth/callback` : undefined
      }
    });
  },

  // 4. Verifikasi OTP (Kode Angka)
  verifyOtp: async (email: string, token: string) => {
    return await supabase.auth.verifyOtp({
      email,
      token,
      type: "magiclink" // Tipe default Supabase untuk verifikasi OTP passwordless
    });
  },

  // 5. Masuk dengan Google
  signInWithGoogle: async () => {
    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }
};
