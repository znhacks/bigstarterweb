// src/app/page.tsx
import { getUser } from "@/lib/auth";
import { getUserTenants } from "@/services/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingOrRedirectPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const tenants = await getUserTenants();

  if (tenants.length > 0) {
    redirect(`/${tenants[0].tenant.slug}/dashboard`);
  }

  redirect("/create-tenant");
}
