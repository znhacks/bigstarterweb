// app/page.tsx
//
// Router pasca-login OTORITATIF (server-side). Ini satu-satunya tempat yang
// memutuskan tujuan user setelah login — bukan tebakan di sisi client.
//
// Sumber kebenaran superadmin: kolom `profiles.is_superadmin` (sama persis
// dgn gate `requireSuperadmin()` & fungsi RLS `is_superadmin()`). Bukan dari
// auth metadata, agar set flag is_superadmin di DB selalu cukup.
import { getServerSession } from "@/lib/session";
import { getUserTenants } from "@/services/tenant";
import { redirect } from "next/navigation";

function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-4 text-4xl font-bold">Selamat Datang di SaaS Kami</h1>
      <p className="mb-8 text-gray-500">
        Kolaborasi tim menjadi lebih mudah dan terorganisir.
      </p>
    </div>
  );
}

export default async function LandingOrRedirectPage() {
  try {
    const session = await getServerSession();

    // Belum login → redirect ke /login
    if (!session) redirect("/login");

    // Superadmin → area admin, terlepas dari membership organisasi.
    if (session.user.isSuperadmin) {
      redirect("/superadmin/dashboard");
    }

    // User biasa → organisasi pertama. Tanpa org, alihkan ke /create-tenant
    const tenants = await getUserTenants();
    if (tenants && tenants.length > 0) {
      redirect(`/${tenants[0].tenant.slug}/dashboard`);
    }

    // Login tapi belum punya org → alihkan ke /create-tenant
    redirect("/create-tenant");
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Error pada LandingOrRedirectPage:", err);
    redirect("/login");
  }
}
