// app/api/theme/route.ts
//
// Per-entity theme resolution & save.
// Priority: profiles.theme > tenants.theme > DEFAULT_THEME.
// Client passes X-Tenant-Id header for tenant resolution.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_THEME } from "@/lib/themes";

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

/** GET /api/theme — resolve effective theme (user > tenant > default). */
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

    // 1. Tenant theme — tenant context is authoritative for tenant pages.
    //    Prefer the explicit id during a sidebar switch; the URL can still contain the old slug.
    let tenantData: any = null;
    if (isTenantSwitch && tenantId) {
      const { data } = await supabaseAdmin
        .from("tenants")
        .select("theme")
        .eq("id", tenantId)
        .maybeSingle();
      tenantData = data;
    } else if (tenantSlug) {
      const { data } = await supabaseAdmin
        .from("tenants")
        .select("theme")
        .eq("slug", tenantSlug)
        .maybeSingle();
      tenantData = data;
    } else if (tenantId) {
      const { data } = await supabaseAdmin
        .from("tenants")
        .select("theme")
        .eq("id", tenantId)
        .maybeSingle();
      tenantData = data;
    }

    if (tenantData?.theme && isValidTheme(tenantData.theme)) {
      return NextResponse.json({ theme: tenantData.theme, source: "tenant" });
    }

    // 2. User theme is a fallback for pages without a tenant theme.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("theme")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.theme && isValidTheme(profile.theme)) {
      return NextResponse.json({ theme: profile.theme, source: "user" });
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
      const { data: membership } = await supabaseAdmin
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: "Not a member of this tenant" }, { status: 403 });
      }

      const { error } = await supabaseAdmin.from("tenants").update({ theme }).eq("id", tenantId);
      if (error) throw error;
    } else {
      // Default: save to user profile
      const { error } = await supabaseAdmin.from("profiles").update({ theme }).eq("id", user.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
