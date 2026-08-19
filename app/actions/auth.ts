"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";

import { headers } from "next/headers";

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

export async function logoutAction() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || "127.0.0.1";
      const userAgent = headersList.get("user-agent") || "JM-Panel Web Portal";
      
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", user.id)
        .maybeSingle();
        
      const role = prof?.is_superadmin ? "superadmin" : "admin";

      await supabase.from("audit_logs").insert({
        action: "LOGOUT",
        entity: "auth",
        ip_address: ip,
        user_agent: userAgent,
        user_id: user.id,
        user_role: role
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error pada logoutAction:", err);
    return { error: err?.message || "Gagal mencatat logout." };
  }
}
