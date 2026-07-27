import { supabase } from "@/lib/supabase";

export const authService = {
  signUpWithPassword: async (email: string, password: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
  },

  signInWithPassword: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  sendPasswordlessAccess: async (email: string, isMagicLink: boolean = false) => {
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: isMagicLink ? `${window.location.origin}/auth/callback` : undefined
      }
    });
  },

  verifyOtp: async (email: string, token: string) => {
    return await supabase.auth.verifyOtp({
      email,
      token,
      type: "magiclink"
    });
  },

  signInWithGoogle: async () => {
    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }
};
