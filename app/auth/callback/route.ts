import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Tangkap parameter 'next' dari URL, jika kosong arahkan ke dashboard default
  const next = searchParams.get("next") ?? "/dashboard";

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
        }
      }
    );

    // Tukar kode verifikasi dari email menjadi session login yang sah di Cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Alihkan pengguna secara aman ke rute tujuan awal (contoh: /join?token=xxx)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Jika terjadi kesalahan kode, alihkan ke halaman error
  return NextResponse.redirect(`${origin}/dashboard/login/v2?error=auth-code-error`);
}
