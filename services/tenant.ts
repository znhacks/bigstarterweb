import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { createClient } from "@/lib/supabase/server";
import { getMembershipsByUser } from "@/supabase/helper/memberships";
import { membershipRepository } from "@/supabase/repositories/memberships";
import type { ActiveTenant, ActiveTenantContext, ResolvedAuthority } from "@/modules/rbac/shared/types";
import type { PermissionName } from "@/modules/rbac/shared/permissions";

type MembershipRow = {
  role_id: string | null;
  roles: {
    id: string;
    name: string;
    role_permissions: { permissions: { name: string } | null }[] | null;
  } | null;
  tenants: ActiveTenant;
};

function resolveAuthority(row: any): ResolvedAuthority {
  const role = row.roles;
  const perms = (role?.role_permissions ?? [])
    .map((rp: any) => rp.permissions?.name)
    .filter((n: any): n is string => typeof n === "string") as PermissionName[];

  return {
    roleId: role?.id ?? "member",
    roleName: role?.name ?? "Member",
    permissions: perms
  };
}

const MEMBERSHIP_SELECT = `
  role_id,
  roles (
    id,
    name,
    role_permissions ( permissions ( name ) )
  ),
  tenants!inner (
    id,
    name,
    slug,
    logo
  )
`;

export const getUserTenants = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Coba query RLS user client
  let { data, error } = await (
    await membershipRepository(supabase)
  )
    .query()
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", user.id);

  // 2. Jika RLS mengembalikan error/kosong, coba dengan supabaseAdmin
  if ((error || !data || data.length === 0) && supabaseAdmin) {
    try {
      const { data: adminData } = await (
        await membershipRepository(supabaseAdmin)
      )
        .query()
        .select(MEMBERSHIP_SELECT)
        .eq("user_id", user.id);

      if (adminData && adminData.length > 0) {
        data = adminData;
      }
    } catch (e) {
      console.warn("Fallback supabaseAdmin error:", e);
    }
  }

  // 3. Jika masih kosong, cek apakah user memiliki relasi sekolah di user_schools/tenant_schools
  if ((!data || data.length === 0) && supabaseAdmin) {
    try {
      const { data: userSchools } = await supabaseAdmin
        .from("user_schools")
        .select("school_id")
        .eq("user_id", user.id);

      if (userSchools && userSchools.length > 0) {
        const sIds = userSchools.map((us: any) => us.school_id);
        const { data: tSchools } = await supabaseAdmin
          .from("tenant_schools")
          .select("tenant_id, tenants(id, name, slug, logo)")
          .in("school_id", sIds);

        if (tSchools && tSchools.length > 0) {
          const fallbackList = tSchools
            .filter((ts: any) => ts.tenants)
            .map((ts: any) => ({
              roleId: "member",
              roleName: "Member",
              permissions: [] as PermissionName[],
              tenant: ts.tenants as ActiveTenant
            }));
          if (fallbackList.length > 0) {
            return fallbackList;
          }
        }
      }
    } catch (e) {
      console.warn("Fallback tenant_schools check error:", e);
    }
  }

  // 4. Auto-repair: Sambungkan user secara otomatis ke tenant utama jika belum terdaftar
  if ((!data || data.length === 0) && supabaseAdmin) {
    try {
      const { data: mainTenant } = await supabaseAdmin
        .from("tenants")
        .select("id, name, slug, logo")
        .limit(1)
        .maybeSingle();

      if (mainTenant) {
        const { data: memberRole } = await supabaseAdmin
          .from("roles")
          .select("id")
          .eq("name", "Member")
          .maybeSingle();

        await supabaseAdmin.from("memberships").insert({
          user_id: user.id,
          tenant_id: mainTenant.id,
          role_id: memberRole?.id || null
        });

        return [
          {
            roleId: memberRole?.id || "member",
            roleName: "Member",
            permissions: [] as PermissionName[],
            tenant: mainTenant as ActiveTenant
          }
        ];
      }
    } catch (autoRepairErr) {
      console.warn("Auto-repair membership error:", autoRepairErr);
    }
  }

  return (data ?? [])
    .map((item: any) => {
      if (!item?.tenants) return null;
      const authority = resolveAuthority(item);
      return {
        ...authority,
        tenant: item.tenants as ActiveTenant
      };
    })
    .filter((t): t is ResolvedAuthority & { tenant: ActiveTenant } => t !== null);
});

export const getActiveTenant = cache(
  async (tenantSlug?: string | null): Promise<ActiveTenantContext | null> => {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return null;

    const membershipRepo = await membershipRepository(supabase);

    if (tenantSlug) {
      let { data, error } = await membershipRepo
        .query()
        .select(`${MEMBERSHIP_SELECT}`)
        .eq("user_id", user.id)
        .eq("tenants.slug", tenantSlug)
        .maybeSingle();

      if ((error || !data) && supabaseAdmin) {
        const { data: adminData } = await (await membershipRepository(supabaseAdmin))
          .query()
          .select(`${MEMBERSHIP_SELECT}`)
          .eq("user_id", user.id)
          .eq("tenants.slug", tenantSlug)
          .maybeSingle();

        if (adminData) data = adminData;
      }

      if (!data && supabaseAdmin) {
        // Direct query to tenants table as last resort
        const { data: directTenant } = await supabaseAdmin
          .from("tenants")
          .select("id, name, slug, logo")
          .eq("slug", tenantSlug)
          .maybeSingle();

        if (directTenant) {
          try {
            const { data: memberRole } = await supabaseAdmin
              .from("roles")
              .select("id")
              .eq("name", "Member")
              .maybeSingle();

            await supabaseAdmin.from("memberships").upsert(
              {
                user_id: user.id,
                tenant_id: directTenant.id,
                role_id: memberRole?.id || null
              },
              { onConflict: "user_id,tenant_id" }
            );
          } catch (upsertErr) {
            console.warn("Notice auto-creating membership in getActiveTenant:", upsertErr);
          }

          return {
            roleId: "member",
            roleName: "Member",
            permissions: [],
            tenant: directTenant
          };
        }
      }

      if (!data) return null;

      const authority = resolveAuthority(data as any);
      return {
        ...authority,
        tenant: (data as any).tenants
      };
    }

    const cookieStore = await cookies();
    const activeTenantId = cookieStore.get("active_tenant_id")?.value;

    if (activeTenantId) {
      const { data, error } = await membershipRepo
        .query()
        .select(`${MEMBERSHIP_SELECT}`)
        .eq("user_id", user.id)
        .eq("tenant_id", activeTenantId)
        .single();

      if (!error && data) {
        const authority = resolveAuthority(data as any);
        if (authority) {
          return {
            ...authority,
            tenant: (data as any).tenants
          };
        }
      }
    }

    const { data: fallbackData, error: fallbackError } = await membershipRepo
      .query()
      .select(`${MEMBERSHIP_SELECT}`)
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (fallbackError || !fallbackData) {
      return null;
    }

    const authority = resolveAuthority(fallbackData as any);
    if (!authority) return null;

    return {
      ...authority,
      tenant: (fallbackData as any).tenants
    };
  }
);
