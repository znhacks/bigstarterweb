import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { RoleEditor } from "./role-editor";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.roles");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function RoleDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: role }, { data: permissions }, { data: grants }] = await Promise.all([
    supabaseAdmin.from("roles").select("id, name, hierarchy_level").eq("id", id).maybeSingle(),
    supabaseAdmin.from("permissions").select("id, name, description").order("name"),
    supabaseAdmin.from("role_permissions").select("permission_id").eq("role_id", id)
  ]);

  if (!role) notFound();

  const grantedIds = (grants ?? []).map((g: any) => g.permission_id as string);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <RoleEditor
        role={role}
        permissions={permissions ?? []}
        grantedIds={grantedIds}
      />
    </div>
  );
}
