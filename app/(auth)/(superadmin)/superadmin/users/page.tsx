// app/(auth)/(superadmin)/superadmin/users/page.tsx
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import UsersDataTable from "./view";
import { getSuperadminUsers } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.users");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function UsersPage() {
  const data = await getSuperadminUsers();

  return (
    <div className="mx-auto w-full">
      <UsersDataTable data={data} />
    </div>
  );
}
