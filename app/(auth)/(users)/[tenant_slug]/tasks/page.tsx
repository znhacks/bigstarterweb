// app/(auth)/(users)/[tenant_slug]/tasks/page.tsx

import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { TasksView } from "./view";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@supabase/supabase-js";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.tasks");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

interface PageProps {
  params: Promise<{ tenant_slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenant_slug } = await params;
  // Gate RBAC: hanya yang punya tasks.read yang bisa mengakses halaman.
  const ctx = await requirePermission(PERMISSIONS.tasksRead, tenant_slug);

  // Inisialisasi klien Supabase admin di Server Component
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Mengambil data langganan tenant secara real-time di sisi server
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, ends_at")
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  const endsAt = sub?.ends_at ? new Date(sub.ends_at) : null;
  const isExpired = endsAt ? new Date() > endsAt : false;

  // Menentukan activePlanId (default ke "free" jika tidak aktif/kedaluwarsa)
  const activePlanId = sub && sub.status === "active" && !isExpired ? sub.plan_id : "free";

  return (
    <TasksView
      tenantSlug={tenant_slug}
      tenantId={ctx.tenant.id}
      tenantName={ctx.tenant.name}
      activePlanId={activePlanId}
    />
  );
}
