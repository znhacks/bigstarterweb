import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { profileRepository } from "@/supabase/repositories/profiles";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { RestoreView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("auth.restore");
  return constructMetadata({ title: t("title") });
}

export default async function RestorePage() {
  const user = await getUser();
  if (!user) redirect("/login?reason=deleted");

  // Profile status='deleted' disembunyikan oleh RLS dari client user-session,
  // jadi baca via service role di server.
  const profileRepo = await profileRepository(supabaseAdmin);
  const { data } = await profileRepo
    .query()
    .select("status, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  // Bila tidak deleted, tidak perlu restore.
  if (!data || data.status !== "deleted") {
    redirect("/");
  }

  return <RestoreView deletedAt={data.deleted_at} />;
}
