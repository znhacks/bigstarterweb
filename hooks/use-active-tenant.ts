"use client";

// Hook client: resolve tenant aktif dari slug URL + memberships user.
// Mirror pola useSession (single fetch, cache state). Return { activeTenant, isTenantAdmin, loaded, refetch }.

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
          "tenant_id, roles(name, hierarchy_level), tenants(id, name, slug, logo)"
        )
        .eq("user_id", user.id);

      const found = ((data as any[]) ?? []).find(
        (m) => m.tenants?.slug === tenantSlug
      );

      if (found?.tenants) {
        setActiveTenant({
          id: found.tenants.id,
          name: found.tenants.name,
          slug: found.tenants.slug,
          logo: found.tenants.logo
        });
        const hierarchy = found.roles?.hierarchy_level;
        setIsTenantAdmin(hierarchy != null && hierarchy >= 50);
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
