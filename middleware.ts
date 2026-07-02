// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const isJoinPage = path.startsWith("/join");
  const isAuthCallback = path.startsWith("/auth/callback");

  // Rute default tujuan setelah login (bisa disesuaikan dengan kebutuhan Anda)
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
      // Peningkatan UX: Simpan halaman asal agar bisa kembali setelah login berhasil
      const nextTarget = encodeURIComponent(`${url.pathname}${url.search}`);
      url.pathname = "/login";
      url.search = `?next=${nextTarget}`;
      return NextResponse.redirect(url);
    }
  }

  // ALUR 2: JIKA USER SUDAH LOGIN
  if (user) {
    if (isAuthPage) {
      // Konsisten menggunakan DEFAULT_REDIRECT_ROUTE dibanding hardcoded "/default"
      url.pathname = DEFAULT_REDIRECT_ROUTE;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|api-docs|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
