"use server";

import { bigstarterConfig } from "@/bigstarter.config";
import { createClient as createSystemClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getRoleByName } from "@/supabase/helper/roles";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/api/supabase-server";

import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { jurnalMengajarSupabase } from "@/lib/jurnalmengajar-supabase";

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

    const tenantsRepo = await tenantRepository(supabaseAdmin);

    const { data: existingTenant } = await tenantsRepo
      .query()
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existingTenant) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    const schoolCode = (formData.get("school_code") as string) || null;
    const schoolIdsRaw = (formData.get("school_ids") as string) || null;
    let schoolList: string[] = [];
    if (schoolIdsRaw) {
      try {
        schoolList = JSON.parse(schoolIdsRaw);
      } catch {
        schoolList = schoolCode ? schoolCode.split(",") : [];
      }
    } else if (schoolCode) {
      schoolList = schoolCode.split(",");
    }

    const { data: newTenant, error: tenantError } = await tenantsRepo
      .insert({
        name: name.trim(),
        slug: slug,
        db_model: finalModel,
        school_code: schoolCode ? schoolCode.trim() : null
      })
      .select()
      .single();

    if (tenantError || !newTenant) {
      return { error: tenantError?.message || "Gagal mendaftarkan organisasi baru." };
    }

    // Sync to tenant_schools junction table
    if (schoolList.length > 0) {
      await syncTenantSchools(newTenant.id, schoolList);
    }

    const { data: ownerRole } = await getRoleByName("Owner", "id", supabaseAdmin);
    const membershipsRepo = await membershipRepository(supabaseAdmin);

    const { error: membershipError } = await membershipsRepo.insert({
      user_id: user.id,
      tenant_id: newTenant.id,
      role_id: ownerRole?.id ?? null
    });

    if (membershipError) {
      return { error: membershipError.message || "Gagal membuat akses membership." };
    }

    if (finalModel === "ISOLATED") {
      const { error: rpcError } = await supabaseAdmin.rpc("create_new_tenant_schema", {
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
  schoolCode?: string;
}) {
  let { userId, regType, orgName, inviteCode, schoolCode } = params;

  if (!userId) {
    const defaultSupabase = await createServerClient();
    const {
      data: { user }
    } = await defaultSupabase.auth.getUser();
    if (user) {
      userId = user.id;
    }
  }

  const isPrecheck = userId === "precheck";

  if (!userId && !isPrecheck) {
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
          db_model: "SHARED",
          school_code: schoolCode ? schoolCode.trim() : null
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

      if (isPrecheck) {
        return { success: true };
      }

      // Cek apakah membership sudah ada
      const { data: existingMembership } = await membershipsRepo
        .query()
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", targetTenantId)
        .maybeSingle();

      if (!existingMembership) {
        // ── Cek batas anggota (free plan limit) ──────────────────────
        const { tenantConfig } = await import("@/config/tenant");
        const limit = tenantConfig.organizations.freeMemberLimit;
        if (limit > 0) {
          const { count: currentCount } = await membershipsRepo
            .query()
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", targetTenantId);

          if ((currentCount ?? 0) >= limit) {
            return {
              error: `Organisasi ini sudah mencapai batas maksimal ${limit} anggota pada paket Free. Silakan hubungi pemilik organisasi untuk meningkatkan paket.`
            };
          }
        }
        // ─────────────────────────────────────────────────────────────

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

/**
  * Helper untuk menyinkronkan daftar sekolah terpilih ke junction table tenant_schools
  */
export async function syncTenantSchools(tenantId: string, schoolCodesOrIds: string[]) {
  if (!tenantId) return;
  try {
    const defaultSupabase = await createServerClient();

    const cleanList = (schoolCodesOrIds || [])
      .flatMap((c) => (typeof c === "string" ? c.split(",") : []))
      .map((c) => c.trim())
      .filter(Boolean);

    // Hapus relasi lama
    await defaultSupabase.from("tenant_schools").delete().eq("tenant_id", tenantId);

    if (cleanList.length > 0) {
      const records = cleanList.map((codeOrId) => ({
        tenant_id: tenantId,
        school_id: codeOrId,
        school_code: codeOrId
      }));

      const { error } = await defaultSupabase.from("tenant_schools").insert(records);
      if (error) {
        console.warn("Notice inserting tenant_schools:", error.message);
      }
    }
  } catch (err) {
    console.error("Error pada syncTenantSchools:", err);
  }
}

/**
 * Server Action untuk mengambil daftar organisasi milik user aktif (Bypasses browser RLS issues).
 */
export async function getUserOrganizationsAction() {
  try {
    const { supabaseAdmin } = await import("@/lib/api/supabase-server");
    const { getUserTenants } = await import("@/services/tenant");
    let tenants = await getUserTenants();

    if (!tenants || tenants.length === 0) {
      // Fallback 1: Query supabaseAdmin directly for memberships of currentUser
      const defaultSupabase = await createServerClient();
      const {
        data: { user }
      } = await defaultSupabase.auth.getUser();

      if (user) {
        const { data: mems } = await supabaseAdmin
          .from("memberships")
          .select("tenant_id, tenants(id, name, slug, logo)")
          .eq("user_id", user.id);

        if (mems && mems.length > 0) {
          tenants = mems
            .filter((m: any) => m.tenants)
            .map((m: any) => ({
              roleId: "member",
              roleName: "Member",
              permissions: [],
              tenant: m.tenants
            }));
        }
      }
    }

    return (tenants || []).map((t) => ({
      id: t.tenant.id,
      name: t.tenant.name,
      slug: t.tenant.slug,
      logo: t.tenant.logo || null
    }));
  } catch (err) {
    console.error("Error pada getUserOrganizationsAction:", err);
    return [];
  }
}

/**
 * Server Action untuk mengambil daftar sekolah terhubung bagi user aktif & tenant (Bypasses browser RLS).
 */
export async function getUserSchoolsAction(tenantSlug?: string) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    const dbClient = systemSupabase || supabase;
    const list: any[] = [];
    const addedIds = new Set<string>();

    // 1. Ambil dari user_schools
    const { data: uSchools } = await dbClient
      .from("user_schools")
      .select("id, user_id, school_id, role, school_code, schools(name, code)")
      .eq("user_id", user.id);

    (uSchools || []).forEach((item: any) => {
      const sId = item.school_id || item.school_code || item.id;
      if (sId && !addedIds.has(sId.toString())) {
        addedIds.add(sId.toString());
        list.push({
          id: item.id,
          user_id: item.user_id,
          school_id: sId.toString(),
          role: item.role || "Guru",
          school_name: item.schools?.name || item.school_code || "Sekolah",
          school_code: item.schools?.code || item.school_code || ""
        });
      }
    });

    // 2. Ambil tenant aktif (dari parameter tenantSlug atau cookie active_tenant_id)
    let targetTenant: any = null;
    if (tenantSlug) {
      const { data: tData } = await dbClient
        .from("tenants")
        .select("id, name, school_code")
        .ilike("slug", tenantSlug)
        .maybeSingle();
      targetTenant = tData;
    }

    if (!targetTenant) {
      const cookieStore = await cookies();
      const activeId = cookieStore.get("active_tenant_id")?.value;
      if (activeId) {
        const { data: tData } = await dbClient
          .from("tenants")
          .select("id, name, school_code")
          .eq("id", activeId)
          .maybeSingle();
        targetTenant = tData;
      }
    }

    if (targetTenant) {
      // Ambil dari tenant_schools
      const { data: tSchools } = await dbClient
        .from("tenant_schools")
        .select("school_id, school_code")
        .eq("tenant_id", targetTenant.id);

      (tSchools || []).forEach((ts: any) => {
        const sId = ts.school_id || ts.school_code;
        if (sId && !addedIds.has(sId.toString())) {
          addedIds.add(sId.toString());
          list.push({
            id: sId.toString(),
            user_id: user.id,
            school_id: sId.toString(),
            role: "Guru",
            school_name: ts.school_code || targetTenant.name || "Sekolah",
            school_code: ts.school_code || ""
          });
        }
      });

      if (targetTenant.school_code) {
        targetTenant.school_code.split(",").forEach((codeStr: string) => {
          const trimmed = codeStr.trim();
          if (trimmed && !addedIds.has(trimmed)) {
            addedIds.add(trimmed);
            list.push({
              id: trimmed,
              user_id: user.id,
              school_id: trimmed,
              role: "Guru",
              school_name: targetTenant.name ? `${targetTenant.name} (${trimmed})` : trimmed,
              school_code: trimmed
            });
          }
        });
      }
    }

    return list;
  } catch (err) {
    console.error("Error pada getUserSchoolsAction:", err);
    return [];
  }
}

export async function getTenantDashboardDataAction(
  tenantId?: string | null,
  tenantSlug?: string,
  schoolCode?: string | null
) {
  try {
    let resolvedTenantId = tenantId || null;
    let targetTenant: any = null;

    if (resolvedTenantId && resolvedTenantId !== "fallback" && !resolvedTenantId.startsWith("direct-")) {
      const { data: t } = await systemSupabase
        .from("tenants")
        .select("id, name, slug, school_code")
        .eq("id", resolvedTenantId)
        .maybeSingle();
      targetTenant = t;
    }

    if (!targetTenant && tenantSlug) {
      const { data: t } = await systemSupabase
        .from("tenants")
        .select("id, name, slug, school_code")
        .ilike("slug", tenantSlug)
        .maybeSingle();
      targetTenant = t;
    }

    if (!targetTenant) {
      const { data: firstT } = await systemSupabase
        .from("tenants")
        .select("id, name, slug, school_code")
        .limit(1)
        .maybeSingle();
      targetTenant = firstT;
    }

    if (!targetTenant) {
      return { members: [], subscription: null, transactions: [] };
    }

    resolvedTenantId = targetTenant.id;

    // Auto-repair: Ensure currently logged in user has a membership row in this tenant
    try {
      const defaultSupabase = await createServerClient();
      const { data: { user: currentUser } } = await defaultSupabase.auth.getUser();

      if (currentUser) {
        const { data: existingMem } = await systemSupabase
          .from("memberships")
          .select("id")
          .eq("tenant_id", resolvedTenantId)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (!existingMem) {
          const { data: memberRole } = await systemSupabase
            .from("roles")
            .select("id")
            .eq("name", "Member")
            .maybeSingle();

          await systemSupabase.from("memberships").insert({
            user_id: currentUser.id,
            tenant_id: resolvedTenantId,
            role_id: memberRole?.id || null
          });
        }
      }
    } catch (memRepairErr) {
      console.warn("Notice auto-repairing membership:", memRepairErr);
    }

    const membersMap = new Map<string, any>();

    // Fetch auth users for accurate names & emails from Supabase Auth admin
    let authUserMap = new Map<string, any>();
    try {
      const { data: authUsers } = await systemSupabase.auth.admin.listUsers();
      if (authUsers?.users) {
        authUserMap = new Map(authUsers.users.map((u) => [u.id, u]));
      }
    } catch (authErr) {
      console.warn("Notice fetching auth users:", authErr);
    }

    // 1. Query Bigstarter DB memberships for this specific tenant
    const { data: rawMemberships } = await systemSupabase
      .from("memberships")
      .select("id, user_id, created_at, role_id, roles(id, name)")
      .eq("tenant_id", resolvedTenantId);

    if (rawMemberships && rawMemberships.length > 0) {
      const userIds = rawMemberships.map((m: any) => m.user_id).filter(Boolean);
      const { data: profs } = await systemSupabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
      rawMemberships.forEach((m: any) => {
        const prof = profMap.get(m.user_id);
        const authUser = authUserMap.get(m.user_id);

        const realName =
          prof?.full_name ||
          prof?.name ||
          prof?.username ||
          authUser?.user_metadata?.full_name ||
          authUser?.user_metadata?.name ||
          (authUser?.email ? authUser.email.split("@")[0] : null) ||
          "Workspace Member";

        const realEmail =
          prof?.email ||
          authUser?.email ||
          "";

        membersMap.set(m.user_id, {
          id: m.id,
          user_id: m.user_id,
          created_at: m.created_at,
          role_id: m.role_id,
          profiles: {
            id: m.user_id,
            full_name: realName,
            email: realEmail,
            avatar: prof?.avatar || prof?.avatar_url || null
          },
          roles: m.roles || { id: "member", name: "Member" }
        });
      });
    }

    const membersList = Array.from(membersMap.values());

    // 4. Fetch Subscription
    const { data: subData } = await systemSupabase
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", resolvedTenantId)
      .maybeSingle();

    // 5. Fetch Transactions
    const { data: txsData } = await systemSupabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", resolvedTenantId)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      members: membersList,
      subscription: subData || null,
      transactions: txsData || []
    };
  } catch (err) {
    console.error("Error pada getTenantDashboardDataAction:", err);
    return { members: [], subscription: null, transactions: [] };
  }
}

