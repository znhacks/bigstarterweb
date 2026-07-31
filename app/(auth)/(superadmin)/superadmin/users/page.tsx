import UsersDataTable from "./view";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { getUsers } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.users");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default async function Page() {
  const t = await getTranslations("superadmin.users");

  const data = await getUsers();

  return (
    <div className="mx-auto w-full space-y-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </div>
      {}
      <UsersDataTable data={data} />
    </div>
  );
}
