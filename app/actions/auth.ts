"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { headers } from "next/headers";

export async function loginAction(formData: { email: string; password: string }) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password
    });

    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "JM-Panel Web Portal";

    if (error) {
      // Catat Percobaan Login Gagal (Suspicious / Failed Attempt)
      try {
        await supabaseAdmin.from("audit_logs").insert({
          action: "LOGIN_FAILED",
          entity: "auth",
          ip_address: ip,
          user_agent: userAgent,
          payload_changes: { email: formData.email, reason: error.message }
        });
      } catch (e) {
        console.error("Gagal mencatat login_failed audit:", e);
      }
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

        const role = prof?.is_superadmin ? "superadmin" : "admin";

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

        // Catat Web Login ke public.audit_logs
        try {
          await supabaseAdmin.from("audit_logs").insert({
            action: "WEB_LOGIN",
            entity: "auth",
            ip_address: ip,
            user_agent: userAgent,
            user_id: data.user.id,
            user_role: role,
            payload_changes: { email: data.user.email || formData.email }
          });
        } catch (e) {
          console.error("Gagal mencatat login audit:", e);
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

export async function logoutAction(params?: { email?: string; userId?: string }) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const targetUserId = user?.id || params?.userId || null;
    const targetEmail = user?.email || params?.email || null;

    if (targetUserId || targetEmail) {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
      const userAgent = headersList.get("user-agent") || "JM-Panel Web Portal";
      
      let role = "user";
      if (targetUserId) {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("is_superadmin")
          .eq("id", targetUserId)
          .maybeSingle();
          
        role = prof?.is_superadmin ? "superadmin" : "admin";
      }

      await supabaseAdmin.from("audit_logs").insert({
        action: "LOGOUT",
        entity: "auth",
        ip_address: ip,
        user_agent: userAgent,
        user_id: targetUserId,
        user_role: role,
        payload_changes: { email: targetEmail }
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error pada logoutAction:", err);
    return { error: err?.message || "Gagal mencatat logout." };
  }
}
