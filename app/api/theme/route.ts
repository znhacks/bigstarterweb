// app/api/theme/route.ts
//
// Per-entity theme resolution & save.
// Priority: custom profiles.theme > tenants.theme > DEFAULT_THEME.
// Client passes X-Tenant-Id header for tenant resolution.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_THEME, type ThemeType } from "@/lib/themes";
import { profileRepository } from "@/supabase/repositories/profiles";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function isValidTheme(obj: any): boolean {
  return (
    obj &&
    typeof obj === "object" &&
    Object.keys(obj).length > 0 &&
    ("preset" in obj || "radius" in obj || "scale" in obj || "contentLayout" in obj)
  );
}

function resolveTheme(obj: unknown): ThemeType {
  return { ...DEFAULT_THEME, ...(obj && typeof obj === "object" ? obj : {}) } as ThemeType;
}

function isCustomTheme(obj: unknown): boolean {
  const theme = resolveTheme(obj);
  return Object.keys(DEFAULT_THEME).some(
    (key) => theme[key as keyof ThemeType] !== DEFAULT_THEME[key as keyof ThemeType]
  );
}

/** GET /api/theme — resolve effective theme (custom user > tenant > default). */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const tenantId = req.headers.get("x-tenant-id");
    const tenantSlug = req.headers.get("x-tenant-slug");
    const isTenantSwitch = req.headers.get("x-tenant-switch") === "true";
    if (!authHeader) return NextResponse.json({ theme: DEFAULT_THEME });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user }
    } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ theme: DEFAULT_THEME });

    // 1. A custom user theme always wins. An all-default user theme inherits the tenant.
    const { data: profile } = await (await profileRepository(supabaseAdmin))
      .query()
      .select("theme")
      .eq("id", user.id)
      .maybeSingle();

    const userTheme = profile?.theme;
    if (isValidTheme(userTheme) && isCustomTheme(userTheme)) {
      return NextResponse.json({ theme: resolveTheme(userTheme), source: "user" });
    }

    // 2. Tenant theme — prefer the explicit id during a sidebar switch because the URL may
    // still contain the previous tenant slug.
    const tenantRepo = await tenantRepository(supabaseAdmin);
    let tenantData: any = null;
    if (isTenantSwitch && tenantId) {
      const { data } = await tenantRepo
        .query()
        .select("theme")
        .eq("id", tenantId)
        .maybeSingle();
      tenantData = data;
    } else if (tenantSlug) {
      const { data } = await tenantRepo
        .query()
        .select("theme")
        .eq("slug", tenantSlug)
        .maybeSingle();
      tenantData = data;
    } else if (tenantId) {
      const { data } = await tenantRepo
        .query()
        .select("theme")
        .eq("id", tenantId)
        .maybeSingle();
      tenantData = data;
    }

    if (tenantData?.theme && isValidTheme(tenantData.theme)) {
      return NextResponse.json({ theme: resolveTheme(tenantData.theme), source: "tenant" });
    }

    // 3. Default
    return NextResponse.json({ theme: DEFAULT_THEME, source: "default" });
  } catch {
    return NextResponse.json({ theme: DEFAULT_THEME });
  }
}

/** POST /api/theme — save theme to profiles.theme or tenants.theme. */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user }
    } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { theme, scope, tenantId } = body;

    if (!theme || typeof theme !== "object") {
      return NextResponse.json({ error: "Invalid theme shape" }, { status: 400 });
    }
    // {} (kosong) = reset ke default → valid.

    if (scope === "tenant" && tenantId) {
      // Verify user is member of this tenant (basic guard)
      const { data: membership } = await (await membershipRepository(supabaseAdmin))
        .query()
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: "Not a member of this tenant" }, { status: 403 });
      }

      const { error } = await (await tenantRepository(supabaseAdmin))
        .query()
        .update({ theme })
        .eq("id", tenantId);
      if (error) throw error;
    } else {
      // Default: save to user profile
      const { error } = await (await profileRepository(supabaseAdmin))
        .query()
        .update({ theme })
        .eq("id", user.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
