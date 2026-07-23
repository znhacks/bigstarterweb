// app/(auth)/(superadmin)/superadmin/roles/page.tsx
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { roleRepository } from "@/supabase/repositories/roles";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { rolePermissionRepository } from "@/supabase/repositories/role-permissions";
import { permissionRepository } from "@/supabase/repositories/permissions";
import { RolesList } from "./roles-list";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.roles");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function RolesPage() {
  // Mengambil data secara asinkron dalam satu waktu (Promise.all)
  const [
    { data: roles },
    { data: memberRows },
    { data: permRows },
    { data: permissions } // 1. TAMBAHKAN: Ambil data seluruh permissions dari database
  ] = await Promise.all([
    (await roleRepository(supabaseAdmin))
      .query()
      .select("id, name, hierarchy_level, created_at")
      .order("hierarchy_level", { ascending: false }),
    (await membershipRepository(supabaseAdmin)).query().select("role_id"),
    (await rolePermissionRepository(supabaseAdmin)).query().select("role_id"),
    // Query untuk mengambil data seluruh hak akses sistem
    (await permissionRepository(supabaseAdmin))
      .query()
      .select("id, name, description")
      .order("name", { ascending: true })
  ]);

  // Kalkulasi jumlah anggota per peran
  const memberCount = new Map<string, number>();
  (memberRows ?? []).forEach((m: any) => {
    if (m.role_id) memberCount.set(m.role_id, (memberCount.get(m.role_id) ?? 0) + 1);
  });

  // Kalkulasi jumlah izin/permissions per peran
  const permCount = new Map<string, number>();
  (permRows ?? []).forEach((p: any) => {
    permCount.set(p.role_id, (permCount.get(p.role_id) ?? 0) + 1);
  });

  // Pemetaan baris data untuk dikonsumsi oleh tabel
  const rows = (roles ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    hierarchy_level: r.hierarchy_level,
    members_count: memberCount.get(r.id) ?? 0,
    permissions_count: permCount.get(r.id) ?? 0
  }));

  return (
    <div className="mx-auto w-full px-4 py-10">
      <RolesList rows={rows} permissions={permissions ?? []} />
    </div>
  );
}
