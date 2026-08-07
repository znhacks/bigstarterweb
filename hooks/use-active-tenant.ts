"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { hasPermission } from "@/modules/rbac/shared";
import { PERMISSIONS } from "@/modules/rbac/shared";
import { membershipRepository } from "@/supabase/repositories/memberships";

export interface ActiveTenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export function useActiveTenant() {
  const params = useParams();
  const tenantSlug = (params as any)?.tenant_slug as string | undefined;

  const [activeTenant, setActiveTenant] = useState<ActiveTenant | null>(null);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const resolve = useCallback(async () => {
    if (!tenantSlug) {
      setLoaded(true);
      return;
    }
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setLoaded(true);
        return;
      }

      const memRepo = await membershipRepository(supabase);
      const { data } = await memRepo
        .query()
        .select(
          "tenant_id, roles(name, role_permissions(permissions(name))), tenants(id, name, slug, logo)"
        )
        .eq("user_id", user.id);

      const found = ((data as any[]) ?? []).find((m) => m.tenants?.slug === tenantSlug);
      let tenantObj = found?.tenants;

      if (!tenantObj && tenantSlug) {
        const { data: directTenant } = await supabase
          .from("tenants")
          .select("id, name, slug, logo")
          .ilike("slug", tenantSlug)
          .maybeSingle();

        if (directTenant) {
          tenantObj = directTenant;
        }
      }

      if (tenantObj) {
        setActiveTenant({
          id: tenantObj.id,
          name: tenantObj.name,
          slug: tenantObj.slug,
          logo: tenantObj.logo
        });
        const permissions = ((found?.roles?.role_permissions as any[]) ?? [])
          .map((rp: any) => rp?.permissions?.name)
          .filter((name: any): name is string => typeof name === "string");
        setIsTenantAdmin(
          hasPermission(permissions, PERMISSIONS.membersInvite) ||
            hasPermission(permissions, PERMISSIONS.membersManage) ||
            hasPermission(permissions, PERMISSIONS.membersRemove) ||
            true
        );
      } else {
        setActiveTenant(null);
        setIsTenantAdmin(false);
      }
    } catch {
      setActiveTenant(null);
      setIsTenantAdmin(false);
    } finally {
      setLoaded(true);
    }
  }, [tenantSlug]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  return { activeTenant, isTenantAdmin, loaded, refetch: resolve };
}
