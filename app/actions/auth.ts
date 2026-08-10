"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";

export async function loginAction(formData: { email: string; password: string }) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    console.error("Error pada loginAction:", err);
    return { error: err?.message || "Gagal terhubung ke server autentikasi." };
  }
}
