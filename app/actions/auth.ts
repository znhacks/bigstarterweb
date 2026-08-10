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

    let redirectUrl = "/";
    try {
      if (data.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_superadmin")
          .eq("id", data.user.id)
          .maybeSingle();

        if (prof?.is_superadmin) {
          redirectUrl = "/superadmin/dashboard";
        } else {
          const { getUserTenants } = await import("@/services/tenant");
          const tenants = await getUserTenants();
          if (tenants && tenants.length > 0) {
            redirectUrl = `/${tenants[0].tenant.slug}/dashboard`;
          } else {
            redirectUrl = "/create-tenant";
          }
        }
      }
    } catch {
      redirectUrl = "/";
    }

    return { success: true, redirectUrl, user: data.user };
  } catch (err: any) {
    console.error("Error pada loginAction:", err);
    return { error: err?.message || "Gagal terhubung ke server autentikasi." };
  }
}
