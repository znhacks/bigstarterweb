// app/(auth)/onboarding/page.tsx
import { requireAuth } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return constructMetadata({ title: t("title"), description: t("desc") });
}

export default async function Page({ searchParams }: PageProps) {
  const { next } = await searchParams;
  await requireAuth("/login");
  const safeNext = next && !next.startsWith("http") && !next.startsWith("//") ? next : "/dashboard";
  return <OnboardingForm next={safeNext} />;
}
