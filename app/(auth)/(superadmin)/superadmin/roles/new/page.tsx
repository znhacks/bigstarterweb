import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { NewRoleForm } from "./new-role-form";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.roles");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function NewRolePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <NewRoleForm />
    </div>
  );
}
