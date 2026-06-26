import { generateMeta } from "@/lib/utils";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Impor komponen klien dan tipe data yang sesuai
import { OrganizationsList, SuperadminOrganization } from "./organizations-list";

export async function generateMetadata() {
  return generateMeta({
    title: "Superadmin Organizations",
    additionalTitle: true,
    description: "Manage and oversee all registered organizations and tenants on the platform.",
    canonical: "/superadmin/organizations"
  });
}

export default async function SuperadminOrganizationsPage() {
  const cookieStore = await cookies();

  // Inisialisasi klien Supabase khusus Server
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        }
      }
    }
  );

  // Ambil data gabungan komprehensif dari Supabase (Server-side)
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select(
      `
      id,
      name,
      created_at,
      memberships (
        id
      ),
      subscriptions (
        status,
        ends_at,
        plans (
          name,
          price
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data organisasi di sisi server:", error.message);
  }

  // Petakan hasil kueri mentah Supabase ke dalam format tipe data SuperadminOrganization[]
  const formattedOrgs: SuperadminOrganization[] = (tenants || []).map((tenant: any) => {
    const firstSub = tenant.subscriptions?.[0];
    const planInfo = firstSub?.plans;

    return {
      id: tenant.id,
      name: tenant.name || "Unnamed Organization",
      created_at: tenant.created_at,
      memberCount: tenant.memberships ? tenant.memberships.length : 0,
      planName: planInfo?.name || "Free",
      planStatus: firstSub?.status || "inactive",
      endsAt: firstSub?.ends_at || null,
      price: planInfo?.price || 0
    };
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {/* Header Halaman */}
      <div className="space-y-1">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">
          Superadmin Organizations
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage and oversee all registered organizations, active plans, member counts, and
          metadata.
        </p>
      </div>

      {/* Panggil komponen klien dengan mengirimkan properti hasil fetch server */}
      <OrganizationsList data={formattedOrgs} />
    </div>
  );
}
