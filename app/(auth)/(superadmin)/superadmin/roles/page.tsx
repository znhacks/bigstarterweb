import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RolesList } from "./roles-list";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.roles");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function RolesPage() {
  const t = await getTranslations("superadmin.roles");

  const [{ data: roles }, { data: memberRows }, { data: permRows }] = await Promise.all([
    supabaseAdmin
      .from("roles")
      .select("id, name, hierarchy_level, created_at")
      .order("hierarchy_level", { ascending: false }),
    supabaseAdmin.from("memberships").select("role_id"),
    supabaseAdmin.from("role_permissions").select("role_id")
  ]);

  const memberCount = new Map<string, number>();
  (memberRows ?? []).forEach((m: any) => {
    if (m.role_id) memberCount.set(m.role_id, (memberCount.get(m.role_id) ?? 0) + 1);
  });
  const permCount = new Map<string, number>();
  (permRows ?? []).forEach((p: any) => {
    permCount.set(p.role_id, (permCount.get(p.role_id) ?? 0) + 1);
  });

  const rows = (roles ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    hierarchy_level: r.hierarchy_level,
    members_count: memberCount.get(r.id) ?? 0,
    permissions_count: permCount.get(r.id) ?? 0
  }));

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("desc")}</p>
        </div>
        <Button asChild>
          <Link href="/superadmin/roles/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("new.title")}
          </Link>
        </Button>
      </div>

      <RolesList rows={rows} />
    </div>
  );
}
