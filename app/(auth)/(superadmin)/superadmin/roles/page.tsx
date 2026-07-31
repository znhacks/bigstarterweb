// app/(auth)/(superadmin)/superadmin/roles/page.tsx
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { roleRepository } from "@/supabase/repositories/roles";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { rolePermissionRepository } from "@/supabase/repositories/role-permissions";
import { permissionRepository } from "@/supabase/repositories/permissions";
import { RolesView } from "./view";
import { getSuperadminRoles } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.roles");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function RolesPage() {
  const data = await getSuperadminRoles();

  return (
    <div className="mx-auto w-full">
      <RolesView data={data} />
    </div>
  );
}
