import { createClient } from "@/lib/supabase/server";
import { getMembershipsByUser } from "@/supabase/helper/memberships";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { cookies } from "next/headers";
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

function resolveAuthority(row: any): ResolvedAuthority | null {
  const role = row.roles;
  if (!role) return null;

  const perms = (role.role_permissions ?? [])
    .map((rp: any) => rp.permissions?.name)
    .filter((n: any): n is string => typeof n === "string") as PermissionName[];

  return {
    roleId: role.id,
    roleName: role.name,
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

export async function getUserTenants() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (
    await membershipRepository(supabase)
  )
    .query()
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching user tenants:", error);
    return [];
  }

  return (data ?? [])
    .map((item: any) => {
      const authority = resolveAuthority(item as any);
      if (!authority) return null;
      return {
        ...authority,
        tenant: (item as any).tenants
      };
    })
    .filter((t): t is ResolvedAuthority & { tenant: ActiveTenant } => t !== null);
}

export async function getActiveTenant(
  tenantSlug?: string | null
): Promise<ActiveTenantContext | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membershipRepo = await membershipRepository(supabase);

  if (tenantSlug) {
    const { data, error } = await membershipRepo
      .query()
      .select(`${MEMBERSHIP_SELECT}`)
      .eq("user_id", user.id)
      .eq("tenants.slug", tenantSlug)
      .single();

    if (error || !data) return null;

    const authority = resolveAuthority(data as any);
    if (!authority) return null;

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
