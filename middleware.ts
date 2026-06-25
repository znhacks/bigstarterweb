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
        // Menambahkan tipe data eksplisit pada parameter cookiesToSet
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

  // Ambil data user aktif secara aman melalui cookies
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Definisikan rute autentikasi publik
  const isAuthPage = path.startsWith("/dashboard/login") || path.startsWith("/dashboard/register");
  const isJoinPage = path.startsWith("/join");
  const isAuthCallback = path.startsWith("/auth/callback");

  // ALUR 1: JIKA USER BELUM LOGIN
  if (!user) {
    if (isJoinPage) {
      const nextTarget = encodeURIComponent(`${url.pathname}${url.search}`);
      url.pathname = "/dashboard/register";
      url.search = `?next=${nextTarget}`;
      return NextResponse.redirect(url);
    }

    if (!isAuthPage && !isAuthCallback) {
      url.pathname = "/dashboard/login";
      return NextResponse.redirect(url);
    }
  }

  // ALUR 2: JIKA USER SUDAH LOGIN
  if (user) {
    if (isAuthPage) {
      url.pathname = "/dashboard/default";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

// Konfigurasi pencocokan rute yang diproses oleh middleware
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
