// src/app/page.tsx
import { getUser } from "@/lib/auth";
import { getUserTenants } from "@/services/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingOrRedirectPage() {
  const user = await getUser();

  console.log("=== [DEBUG ROOT PAGE] ===");
  console.log("User Logged In:", user?.email || "Belum Login");

  if (user) {
    const tenants = await getUserTenants();
    console.log("User Tenants di Database:", tenants);

    if (tenants.length > 0) {
      console.log(`Mengalihkan ke tenant pertama: /${tenants[0].slug}`);
      redirect(`/${tenants[0].slug}`);
    } else {
      console.log("User tidak punya tenant. Mengalihkan ke /create-tenant");
      redirect("/create-tenant");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-4 text-4xl font-bold">Selamat Datang di SaaS Kami</h1>
      <p className="mb-8 text-gray-500">Kolaborasi tim menjadi lebih mudah dan terorganisir.</p>
    </div>
  );
}
