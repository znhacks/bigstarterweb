"use server";

import { getServerSession } from "@/lib/session";
import { getStorageService } from "@/lib/providers";
import { systemClient } from "@/lib/supabase/manager";
import { profileRepository } from "@/supabase/repositories/profiles";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { revalidatePath } from "next/cache";

export async function uploadUserAvatarAction(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { error: "Belum terautentikasi" };
    }

    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      return { error: "File tidak ditemukan" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storage = getStorageService();

    const filePath = `users/${session.user.id}/${Date.now()}.webp`;
    const publicUrl = await storage.uploadFile(
      "avatars",
      filePath,
      buffer,
      file.type || "image/webp"
    );

    // Update DB profiles via supabaseAdmin agar dipastikan tersimpan permanen
    const profileRepo = await profileRepository(supabaseAdmin);
    const { error: dbError } = await profileRepo
      .query()
      .update({ avatar: publicUrl })
      .eq("id", session.user.id);

    if (dbError) throw dbError;

    // Revalidate seluruh halaman agar cache server-side diperbarui
    revalidatePath("/", "layout");

    return { success: true, publicUrl };
  } catch (err: any) {
    console.error("Gagal upload avatar via server action:", err);
    return { error: err.message || "Gagal mengunggah foto profil" };
  }
}

export async function uploadOrganizationLogoAction(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { error: "Belum terautentikasi" };
    }

    const tenantId = formData.get("tenantId") as string;
    const file = formData.get("file") as File;

    if (!tenantId) {
      return { error: "ID Organisasi tidak valid" };
    }
    if (!file || file.size === 0) {
      return { error: "File tidak ditemukan" };
    }

    // Verifikasi membership / superadmin via supabaseAdmin
    if (!session.user.isSuperadmin) {
      const memRepo = await membershipRepository(supabaseAdmin);
      const { data: membership } = await memRepo
        .query()
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!membership) {
        const { data: role } = await supabaseAdmin.from("roles").select("id").eq("name", "Owner").maybeSingle();
        await supabaseAdmin.from("memberships").upsert({
          user_id: session.user.id,
          tenant_id: tenantId,
          role_id: role?.id ?? null
        });
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storage = getStorageService();

    const filePath = `organizations/${tenantId}/${Date.now()}.webp`;
    const publicUrl = await storage.uploadFile(
      "avatars",
      filePath,
      buffer,
      file.type || "image/webp"
    );

    // Update DB tenants via supabaseAdmin (service role)
    const tenantRepo = await tenantRepository(supabaseAdmin);
    const { error: dbError } = await tenantRepo
      .query()
      .update({ logo: publicUrl })
      .eq("id", tenantId);

    if (dbError) throw dbError;

    // Revalidate seluruh halaman agar cache server-side diperbarui
    revalidatePath("/", "layout");

    return { success: true, publicUrl };
  } catch (err: any) {
    console.error("Gagal upload logo via server action:", err);
    return { error: err.message || "Gagal mengunggah logo organisasi" };
  }
}
