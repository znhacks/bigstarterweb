"use server";

import { bigstarterConfig } from "@/bigstarter.config";
import { createClient as createSystemClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getRoleByName } from "@/supabase/helper/roles";
import { cookies } from "next/headers";

import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your_")
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const systemSupabase = createSystemClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceKey,
  {
    db: { schema: "public" },
    auth: { persistSession: false }
  }
);

export async function createTenant(formData: FormData) {
  const defaultSupabase = await createServerClient();
  const {
    data: { user }
  } = await defaultSupabase.auth.getUser();

  if (!user) {
    return { redirect: "/login?next=/create-tenant" };
  }

  try {
    const name = formData.get("name") as string;
    if (!name || name.trim().length < 2) {
      return { error: "Nama organisasi minimal harus memiliki 2 karakter." };
    }

    const config = bigstarterConfig.database.multiTenancy;
    const requestedPlan = formData.get("plan") as string;
    let finalModel: "SHARED" | "ISOLATED" = requestedPlan === "ENTERPRISE" ? "ISOLATED" : "SHARED";

    if (config.forceModelGlobally) {
      finalModel = config.forceModelGlobally;
    } else {
      if (finalModel === "SHARED" && !config.allowModel1Shared) {
        return { error: "Registrasi Model 1 (Shared) sedang dinonaktifkan." };
      }
      if (finalModel === "ISOLATED" && !config.allowModel2Isolated) {
        return { error: "Registrasi Model 2 (Isolated) sedang dinonaktifkan." };
      }
    }

    let slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const tenantsRepo = await tenantRepository(systemSupabase);

    const { data: existingTenant } = await tenantsRepo
      .query()
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existingTenant) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    const { data: newTenant, error: tenantError } = await tenantsRepo
      .insert({
        name: name.trim(),
        slug: slug,
        db_model: finalModel
      })
      .select()
      .single();

    if (tenantError || !newTenant) {
      return { error: tenantError?.message || "Gagal mendaftarkan organisasi baru." };
    }

    const { data: ownerRole } = await getRoleByName("Owner", "id", systemSupabase);
    const membershipsRepo = await membershipRepository(systemSupabase);

    const { error: membershipError } = await membershipsRepo.insert({
      user_id: user.id,
      tenant_id: newTenant.id,
      role_id: ownerRole?.id ?? null
    });

    if (membershipError) {
      return { error: membershipError.message || "Gagal membuat akses membership." };
    }

    if (finalModel === "ISOLATED") {
      const { error: rpcError } = await systemSupabase.rpc("create_new_tenant_schema", {
        tenant_subdomain: slug
      });

      if (rpcError) {
        return {
          error: `Tenant terdaftar, namun gagal menyiapkan ruang penyimpanan data: ${rpcError.message}`
        };
      }
    }

    const cookieStore = await cookies();
    cookieStore.set("active_tenant_id", newTenant.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return { success: true, slug: newTenant.slug };
  } catch (error: any) {
    console.error("Error pada server action createTenant:", error);
    return {
      error: error?.message || "Terjadi kesalahan internal pada server saat memproses data."
    };
  }
}

import { verifyInviteToken } from "@/lib/invite/token";
import { invitationRepository } from "@/supabase/repositories/invitations";

export async function setupRegistrationTenant(params: {
  userId?: string;
  regType: "create" | "join";
  orgName?: string;
  inviteCode?: string;
}) {
  let { userId, regType, orgName, inviteCode } = params;

  if (!userId) {
    const defaultSupabase = await createServerClient();
    const {
      data: { user }
    } = await defaultSupabase.auth.getUser();
    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    return { error: "Pengguna tidak terautentikasi." };
  }

  try {
    const cookieStore = await cookies();

    if (regType === "create") {
      const name = (orgName || "").trim();
      if (name.length < 2) {
        return { error: "Nama organisasi minimal harus 2 karakter." };
      }

      let slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const tenantsRepo = await tenantRepository(systemSupabase);
      const { data: existingTenant } = await tenantsRepo
        .query()
        .select("slug")
        .eq("slug", slug)
        .maybeSingle();

      if (existingTenant) {
        const suffix = Math.random().toString(36).substring(2, 6);
        slug = `${slug}-${suffix}`;
      }

      const { data: newTenant, error: tenantError } = await tenantsRepo
        .insert({
          name: name,
          slug: slug,
          db_model: "SHARED"
        })
        .select()
        .single();

      if (tenantError || !newTenant) {
        return { error: tenantError?.message || "Gagal membuat organisasi baru." };
      }

      const { data: ownerRole } = await getRoleByName("Owner", "id", systemSupabase);
      const membershipsRepo = await membershipRepository(systemSupabase);

      const { error: membershipError } = await membershipsRepo.insert({
        user_id: userId,
        tenant_id: newTenant.id,
        role_id: ownerRole?.id ?? null
      });

      if (membershipError) {
        return { error: membershipError.message || "Gagal membuat keanggotaan." };
      }

      cookieStore.set("active_tenant_id", newTenant.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      });

      return { success: true, tenantSlug: newTenant.slug, tenantId: newTenant.id };
    } else {
      // JOIN OPTION
      const code = (inviteCode || "").trim();
      if (!code) {
        return { error: "Silakan masukkan kode atau token organisasi." };
      }

      const tenantsRepo = await tenantRepository(systemSupabase);
      const membershipsRepo = await membershipRepository(systemSupabase);
      const invitationsRepo = await invitationRepository(systemSupabase);

      let targetTenantId: string | null = null;
      let targetRoleId: string | null = null;
      let invitationIdToDelete: string | null = null;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

      // 1. Cek apakah ini signed invite token (HMAC)
      const tokenPayload = verifyInviteToken(code);
      if (tokenPayload) {
        const { data: invite } = await invitationsRepo
          .query()
          .select("id, tenant_id, role_id")
          .eq("id", tokenPayload.i)
          .maybeSingle();

        if (invite) {
          targetTenantId = invite.tenant_id;
          targetRoleId = invite.role_id;
          invitationIdToDelete = invite.id;
        }
      }

      // 2. Cari berdasarkan slug (case-insensitive)
      if (!targetTenantId) {
        const { data: tenantBySlug } = await tenantsRepo
          .query()
          .select("id, slug")
          .ilike("slug", code)
          .maybeSingle();

        if (tenantBySlug) {
          targetTenantId = tenantBySlug.id;
          const { data: memberRole } = await getRoleByName("Member", "id", systemSupabase);
          targetRoleId = memberRole?.id ?? null;
        }
      }

      // 3. Cari berdasarkan nama organisasi (case-insensitive)
      if (!targetTenantId) {
        const { data: tenantByName } = await tenantsRepo
          .query()
          .select("id, slug")
          .ilike("name", code)
          .maybeSingle();

        if (tenantByName) {
          targetTenantId = tenantByName.id;
          const { data: memberRole } = await getRoleByName("Member", "id", systemSupabase);
          targetRoleId = memberRole?.id ?? null;
        }
      }

      // 4. Jika format UUID, cari berdasarkan ID tenant
      if (!targetTenantId && isUuid) {
        const { data: tenantById } = await tenantsRepo
          .query()
          .select("id, slug")
          .eq("id", code)
          .maybeSingle();

        if (tenantById) {
          targetTenantId = tenantById.id;
          const { data: memberRole } = await getRoleByName("Member", "id", systemSupabase);
          targetRoleId = memberRole?.id ?? null;
        }
      }

      // 5. Jika format UUID, cari di tabel invitations berdasarkan ID undangan
      if (!targetTenantId && isUuid) {
        const { data: inviteById } = await invitationsRepo
          .query()
          .select("id, tenant_id, role_id")
          .eq("id", code)
          .maybeSingle();

        if (inviteById) {
          targetTenantId = inviteById.tenant_id;
          targetRoleId = inviteById.role_id;
          invitationIdToDelete = inviteById.id;
        }
      }

      if (!targetTenantId) {
        return { error: "Kode atau token organisasi tidak valid atau tidak ditemukan." };
      }

      // Cek apakah membership sudah ada
      const { data: existingMembership } = await membershipsRepo
        .query()
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", targetTenantId)
        .maybeSingle();

      if (!existingMembership) {
        const { error: memErr } = await membershipsRepo.insert({
          user_id: userId,
          tenant_id: targetTenantId,
          role_id: targetRoleId
        });

        if (memErr) {
          return { error: memErr.message || "Gagal bergabung ke organisasi." };
        }
      }

      if (invitationIdToDelete) {
        await invitationsRepo.query().delete().eq("id", invitationIdToDelete);
      }

      const { data: joinedTenant } = await tenantsRepo
        .query()
        .select("slug")
        .eq("id", targetTenantId)
        .single();

      cookieStore.set("active_tenant_id", targetTenantId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      });

      return {
        success: true,
        tenantSlug: joinedTenant?.slug || "",
        tenantId: targetTenantId
      };
    }
  } catch (err: any) {
    console.error("Error pada setupRegistrationTenant:", err);
    return { error: err?.message || "Gagal memproses pendaftaran organisasi." };
  }
}
