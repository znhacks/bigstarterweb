// app/auth/callback/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/auth";
import { profileRepository } from "@/supabase/repositories/profiles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  // Keamanan: Pastikan 'next' hanya berupa path relatif untuk mencegah open redirect
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
            } catch {
              // Diabaikan jika dipanggil dari Server Component
            }
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
      // Cek status akun setelah login (active/deleted/banned).
      const {
        data: { user }
      } = await supabase.auth.getUser();

      // Pastikan profile row ada (OAuth/magic-link tak buat profile di client).
      if (user) await ensureProfile(user);

      const { data: profile } = await (await profileRepository(supabase))
        .query()
        .select("status, banned_until, address_country")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      const status = (profile as any)?.status ?? "active";

      if (status === "deleted") {
        return NextResponse.redirect(`${origin}/restore`);
      }
      if (status === "banned") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?reason=banned`);
      }
      // Onboarding: bila belum pilih negara → ke halaman onboarding (sebelum masuk app).
      if (!(profile as any)?.address_country) {
        const safeNext = next || "/";
        return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(safeNext)}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
