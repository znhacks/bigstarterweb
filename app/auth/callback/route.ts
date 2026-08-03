import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/auth";
import { profileRepository } from "@/supabase/repositories/profiles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (next.startsWith("http://") || next.startsWith("https://") || next.startsWith("//")) {
    next = "/";
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          }
        },
        auth: {
          experimental: {
            passkey: true
          }
        }
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) await ensureProfile(user);

      const { data: profile } = await (
        await profileRepository(supabase)
      )
        .query()
        .select("status, banned_until, address_country, is_superadmin")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      const status = (profile as any)?.status ?? "active";
      // Sumber kebenaran superadmin sama dgn middleware & requireSuperadmin:
      // kolom DB `profiles.is_superadmin` (OR app_metadata sebagai fast path).
      const isSuperadmin =
        (profile as any)?.is_superadmin === true ||
        user?.app_metadata?.role === "superadmin";

      if (status === "deleted") {
        return NextResponse.redirect(`${origin}/restore`);
      }
      if (status === "banned") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?reason=banned`);
      }

      // Onboarding gate hanya untuk user biasa. Superadmin di-bypass (konsisten
      // dgn middleware) lalu dilepas ke root router (`/`) yang akan mengarahkan
      // ke /superadmin/dashboard.
      if (!isSuperadmin && !(profile as any)?.address_country) {
        const safeNext = next || "/";
        return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(safeNext)}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
