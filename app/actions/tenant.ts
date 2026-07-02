"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server Action untuk mengganti organisasi aktif (digunakan pada Flat Route)
 */
export async function switchTenant(tenantId: string, redirectTo: string = "/") {
  const cookieStore = await cookies();

  // Set cookie organisasi aktif yang bertahan selama 30 hari
  cookieStore.set("active_tenant_id", tenantId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  // Redirect ulang untuk memuat data organisasi baru
  redirect(redirectTo);
}
