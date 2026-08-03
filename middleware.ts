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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      },
      auth: {
        experimental: {
          passkey: true
        }
      }
    }
  );

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

  // ONBOARDING GATE: user aktif tapi belum pilih negara → paksa ke /onboarding
  // (kecuali sedang di onboarding/auth/logout agar tidak loop).
  if (!hasCountry && !isSuperadmin) {
    const onboardingAllowed =
      path.startsWith("/onboarding") ||
      path.startsWith("/auth") ||
      path.startsWith("/logout");
    if (!onboardingAllowed) {
      const nextTarget = encodeURIComponent(`${url.pathname}${url.search}`);
      url.pathname = "/onboarding";
      url.search = `?next=${nextTarget}`;
      return NextResponse.redirect(url);
    }
  }

  // ORGANIZATION GATE: organizations.requireOrganization = true → user tanpa org
  // → redirect ke /create-tenant (kecuali route yg dikecualikan utk hindari loop).
  if (tenantConfig.organizations.requireOrganization && !isSuperadmin) {
    const orgAllowed =
      path.startsWith("/create-tenant") ||
      path.startsWith("/auth") ||
      path.startsWith("/logout") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/settings") ||
      path.startsWith("/superadmin");
    if (!orgAllowed) {
      const memRepo = await membershipRepository(supabase);
      const { count } = await memRepo
        .query()
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!count || count === 0) {
        url.pathname = "/create-tenant";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|api-docs|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
