import { generateMeta } from "@/lib/utils";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Impor komponen Data Table dan tipe data User
import UsersDataTable, { User } from "./data-table";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.users");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default async function Page() {
  const cookieStore = await cookies();
  const t = await getTranslations("superadmin.users");

  // Inisialisasi klien Supabase khusus Server
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
          } catch {}
        }
      }
    }
  );

  // 1. Ambil data user aktif terlebih dahulu di server untuk mengetahui bahasanya
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // 2. Ambil data gabungan dari Supabase secara Server-Side
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      created_at,
      avatar,
      memberships (
        role,
        tenants (
          id,
          name,
          subscriptions (
            status,
            plans (
              name
            )
          )
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat data pengguna server-side:", error.message);
  }

  // 3. Petakan hasil kueri ke tipe data User[]
  const formattedUsers: User[] = (profiles || []).map((prof: any, index: number) => {
    const fullName = prof.full_name || "Unknown User";
    const firstMembership = prof.memberships?.[0];
    const tenant = firstMembership?.tenants;
    const firstSub = tenant?.subscriptions?.[0];

    const planName = firstSub?.plans?.name || "Free";
    const statusVal = firstSub?.status === "active" ? "active" : "inactive";

    return {
      id: index + 1,
      dbId: prof.id,
      firstName: fullName.split(" ")[0] || "",
      lastName: fullName.split(" ").slice(1).join(" ") || "",
      name: fullName,
      role: firstMembership?.role || "Member",
      plan_name: planName,
      email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      country: "United States",
      status: statusVal as "active" | "inactive" | "pending",
      image: prof.avatar || `https://i.pravatar.cc/150?img=${(index % 70) + 1}`
    };
  });

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-10">
      {/* Header Halaman menggunakan teks bahasa yang terjemahkan di server */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("desc")}</p>
      </div>

      {/* Kirim data ke Komponen Tabel Klien */}
      <UsersDataTable data={formattedUsers} />
    </div>
  );
}
