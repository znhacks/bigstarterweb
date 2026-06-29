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

// Menyelaraskan penamaan kunci Bahasa Indonesia dengan kamus global
const organizationAdmin = {
  English: {
    title: "Superadmin Organizations",
    detail:
      "Manage and oversee all registered organizations, active plans, member counts, and metadata."
  },
  "Bahasa Indonesia": {
    title: "Organisasi Superadmin",
    detail:
      "Kelola dan awasi semua organisasi yang terdaftar, paket yang aktif, jumlah anggota, serta metadata."
  },
  Español: {
    title: "Organizaciones del Superadministrador",
    detail:
      "Administra y supervisa todas las organizaciones registradas, los planes activos, la cantidad de miembros y los metadatos."
  }
};

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

  // 1. Ambil data user aktif di server untuk mendeteksi bahasa pengaturannya
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const userLanguage = user?.user_metadata?.language || "English";

  // Normalisasi jika ada perbedaan penamaan kunci bahasa
  const activeLanguage = userLanguage === "Indonesia" ? "Bahasa Indonesia" : userLanguage;
  const t =
    organizationAdmin[activeLanguage as keyof typeof organizationAdmin] ||
    organizationAdmin["English"];

  // 2. Ambil data gabungan komprehensif dari Supabase (Server-side)
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

  // 3. Petakan hasil kueri mentah Supabase ke dalam format tipe data SuperadminOrganization[]
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
      {/* Header Halaman menggunakan teks bahasa yang diterjemahkan di server */}
      <div className="space-y-1">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.detail}</p>
      </div>

      {/* Kirim data ke Komponen Klien */}
      <OrganizationsList data={formattedOrgs} />
    </div>
  );
}
