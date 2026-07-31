import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { profileRepository } from "@/supabase/repositories/profiles";
import { getAnnouncements } from "../action";
import { AnnouncementsView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.notifications.announcements");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const [announcements, tenantsRes, usersRes] = await Promise.all([
    getAnnouncements(),
    (await tenantRepository(supabaseAdmin)).query().select("id, name").order("name", { ascending: true }),
    (await profileRepository(supabaseAdmin))
      .query()
      .select("id, email")
      .order("email", { ascending: true })
      .limit(200)
  ]);

  return (
    <AnnouncementsView
      announcements={announcements}
      tenants={tenantsRes.data ?? []}
      users={usersRes.data ?? []}
    />
  );
}
