// app/(auth)/(users)/[tenant_slug]/tasks/page.tsx

import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { TasksView } from "./view";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { getActivePlan } from "@/services/payment/billing/gating";

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

  // Ambil paket aktif tenant (DB-driven: decode plans.features[] -> featureGates)
  const tenantPlan = await getActivePlan(ctx.tenant.id);

  return (
    <TasksView
      tenantSlug={tenant_slug}
      tenantId={ctx.tenant.id}
      tenantName={ctx.tenant.name}
      featureGates={tenantPlan.featureGates}
      planName={tenantPlan.name}
    />
  );
}
