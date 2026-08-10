// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { profileRepository } from "@/supabase/repositories/profiles";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { tenantConfig } from "@/config/tenant";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const urlStr =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://bsicqpiqskrwqesqijtf.supabase.co";

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaWNxcGlxc2tyd3Flc3FpanRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTcxMzksImV4cCI6MjEwMTI5MzEzOX0.JDm93ruPLqJL-xwp48G4e7IQJLyQKPf5A0HwmoUjrwM";

  const supabase = createServerClient(
    urlStr,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: any;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();
    const path = url.pathname;

    const isAuthPage =
      path.startsWith("/login") ||
      path.startsWith("/register") ||
      path.startsWith("/forgot-password");
    const isRestorePage = path.startsWith("/restore");
    const isJoinPage = path.startsWith("/join");
    const isAuthCallback = path.startsWith("/auth/callback");

    // Rute default tujuan setelah login
    const DEFAULT_REDIRECT_ROUTE = "/";

    // ALUR 1: JIKA USER BELUM LOGIN
    if (!user) {
      if (isJoinPage) {
        const nextTarget = encodeURIComponent(`${url.pathname}${url.search}`);
        url.pathname = "/register";
        url.search = `?next=${nextTarget}`;
        return NextResponse.redirect(url);
      }

      if (!isAuthPage && !isAuthCallback) {
        const nextTarget = encodeURIComponent(`${url.pathname}${url.search}`);
        url.pathname = "/login";
        url.search = `?next=${nextTarget}`;
        return NextResponse.redirect(url);
      }

      return response;
    }

    // ALUR 2: USER SUDAH LOGIN — cek status akun (active/deleted/banned).
    // Profile SENDIRI selalu bisa dibaca (policy profiles mengizinkan id=auth.uid()
    // meski deleted/banned).
    const profileRepo = await profileRepository(supabase);
    const { data: profile } = await profileRepo
      .query()
      .select("status, banned_until, banned_reason, address_country, is_superadmin")
      .eq("id", user.id)
      .maybeSingle();

    const status = (profile as any)?.status ?? "active";
    const bannedUntil = (profile as any)?.banned_until ?? null;
    const hasCountry = !!(profile as any)?.address_country;
    const isSuperadmin =
      (profile as any)?.is_superadmin === true ||
      user.app_metadata?.role === "superadmin";

    // (a) SOFT-DELETED → arahkan ke /restore (kecuali route publik/restore/login).
    if (status === "deleted") {
      const allowed = isRestorePage || isAuthPage || isAuthCallback;
      if (!allowed) {
        url.pathname = "/restore";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return response;
    }

    // (b) BANNED → blok akses app.
    if (status === "banned") {
      const expired = bannedUntil ? new Date(bannedUntil).getTime() <= Date.now() : false;
      if (expired) {
        // Lazy unban: ban kedaluwarsa → aktifkan kembali (RLS mengizinkan update sendiri).
        await profileRepo
          .query()
          .update({ status: "active", banned_until: null, banned_reason: null })
          .eq("id", user.id);
        // lanjut sebagai active (di bawah)
      } else {
        const allowed = isAuthPage || isAuthCallback;
        if (!allowed) {
          url.pathname = "/login";
          url.search = "?reason=banned";
          return NextResponse.redirect(url);
        }
        return response;
      }
    }

    // Protect /superadmin routes from non-superadmins
    if (path.startsWith("/superadmin") && !isSuperadmin) {
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Redirect Superadmin accessing root / or /dashboard to /superadmin/dashboard
    if (isSuperadmin && (path === "/" || path === "" || path === "/dashboard")) {
      url.pathname = "/superadmin/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // (c) ACTIVE — alur normal.
    if (isAuthPage) {
      url.pathname = isSuperadmin ? "/superadmin/dashboard" : DEFAULT_REDIRECT_ROUTE;
      url.search = "";
      return NextResponse.redirect(url);
    }

    // ONBOARDING GATE (Dilewati agar tidak terjebak loop pada rute yang tidak ada)

    // ORGANIZATION GATE (Dilewati agar penanganan organisasi dikelola otoritatif oleh getUserTenants)

    return response;
  } catch (error) {
    console.error("Middleware error caught gracefully:", error);
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|api-docs|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js|map)$).*)"
  ]
};
