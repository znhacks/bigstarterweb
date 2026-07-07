// ==========================================
// SEPARATOR UNTUK BERKAS BERIKUTNYA:
// app/(auth)/(superadmin)/superadmin/organizations/page.tsx
// ==========================================

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/api/supabase-server";

// Impor komponen klien, tipe data, serta config statis
import { OrganizationsList, SuperadminOrganization } from "./organizations-list";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { plans as billingPlans } from "@/config/billing";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.organizations");

  const titleText = t.has("title") ? t("title") : "Organizations - Superadmin";
  const descText = t.has("description")
    ? t("description")
    : "Manage and view all platform tenants.";

  return constructMetadata({
    title: titleText,
    description: descText
  });
}

export default async function SuperadminOrganizationsPage() {
  const cookieStore = await cookies();
  const t = await getTranslations("superadmin.organizations");

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

  // Ambil data dari Supabase (Server-side).
  // Plan tidak ada di DB (didefinisikan di config/billing.ts), jadi hanya
  // ambil plan_id dari subscriptions lalu cocokkan ke konfigurasi statis.
  const { data: tenants, error } = await supabaseAdmin
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
        plan_id
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil data organisasi di sisi server:", error.message);
  }

  // Petakan hasil kueri mentah dengan mencocokkan konfigurasi paket statis
  const formattedOrgs: SuperadminOrganization[] = (tenants || []).map((tenant: any) => {
    const firstSub = tenant.subscriptions?.[0];

    // Cari detail paket berdasarkan plan_id statis dari billing.ts
    const planConfig = billingPlans.find((p) => p.id === firstSub?.plan_id);
    // Tampilkan harga bulanan (UI menampilkan "/mo")
    const price = planConfig ? planConfig.prices.monthly.amount : 0;

    return {
      id: tenant.id,
      name: tenant.name || "Unnamed Organization",
      created_at: tenant.created_at,
      memberCount: tenant.memberships ? tenant.memberships.length : 0,
      planName: planConfig ? planConfig.name : firstSub?.plan_id || "Free",
      planStatus: firstSub?.status || "inactive",
      endsAt: firstSub?.ends_at || null,
      price: price
    };
  });

  const titleText = t.has("title") ? t("title") : "Organizations";
  const detailText = t.has("detail")
    ? t("detail")
    : "Manage and view all tenant organizations registered in the system.";

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{titleText}</h1>
        <p className="text-muted-foreground text-sm">{detailText}</p>
      </div>

      <OrganizationsList data={formattedOrgs} />
    </div>
  );
}
