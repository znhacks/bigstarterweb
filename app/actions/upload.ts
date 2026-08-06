"use server";

import { getServerSession } from "@/lib/session";
import { getStorageService } from "@/lib/providers";
import { systemClient } from "@/lib/supabase/manager";
import { profileRepository } from "@/supabase/repositories/profiles";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";
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

    // Update DB profiles via systemClient (service role) agar dipastikan tersimpan permanen
    const profileRepo = await profileRepository(systemClient);
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

    // Verifikasi membership / superadmin via systemClient
    if (!session.user.isSuperadmin) {
      const memRepo = await membershipRepository(systemClient);
      const { data: membership } = await memRepo
        .query()
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!membership) {
        return { error: "Anda tidak memiliki akses ke organisasi ini" };
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

    // Update DB tenants via systemClient (service role)
    const tenantRepo = await tenantRepository(systemClient);
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
