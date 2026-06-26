import Link from "next/link";
import { generateMeta } from "@/lib/utils";

import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Impor komponen Data Table dan tipe data User
import UsersDataTable, { User } from "./components/users-data-table";

export async function generateMetadata() {
  return generateMeta({
    title: "Login Page v2",
    description:
      "A login form with email and password. There's an option to login with Google and a link to sign up if you don't have an account.",
    canonical: "/login/v2"
  });
}

export default async function Page() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        }
      }
    }
  );

  // MENGAMBIL KOLOM AVATAR SECARA NYATA DARI SUPABASE
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      created_at,
      avatar, -- <-- Memuat kolom avatar dari database
      memberships (
        role,
        tenants (
          id,
          name,
          subscriptions (
            status,
            plans (
              name
            )
          )
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat data pengguna server-side:", error.message);
  }

  const formattedUsers: User[] = (profiles || []).map((prof: any, index: number) => {
    const fullName = prof.full_name || "Unknown User";
    const firstMembership = prof.memberships?.[0];
    const tenant = firstMembership?.tenants;
    const firstSub = tenant?.subscriptions?.[0];

    const planName = firstSub?.plans?.name || "Free";
    const statusVal = firstSub?.status === "active" ? "active" : "inactive";

    return {
      id: index + 1,
      dbId: prof.id,
      firstName: fullName.split(" ")[0] || "",
      lastName: fullName.split(" ").slice(1).join(" ") || "",
      name: fullName,
      role: firstMembership?.role || "Member",
      plan_name: planName,
      email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      country: "United States",
      status: statusVal as "active" | "inactive" | "pending",
      // MENGGUNAKAN AVATAR DARI SUPABASE DATABASE SECARA NYATA
      image: prof.avatar || `https://i.pravatar.cc/150?img=${(index % 70) + 1}`
    };
  });

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <Button asChild>
          <Link href="#">
            <PlusCircledIcon className="mr-2 h-4 w-4" /> Add New User
          </Link>
        </Button>
      </div>
      <UsersDataTable data={formattedUsers} />
    </>
  );
}
