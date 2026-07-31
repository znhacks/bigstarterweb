// app/(auth)/(superadmin)/superadmin/users/actions.ts

import { supabaseAdmin } from "@/lib/api/supabase-server";
import { planRepository } from "@/supabase/repositories/plans";
import { profileRepository } from "@/supabase/repositories/profiles";
import { User } from "./logic";

export async function getUsers(): Promise<User[]> {
  const { data: profiles, error } = await (
    await profileRepository(supabaseAdmin)
  )
    .query()
    .select(
      `
      id,
      full_name,
      avatar,
      created_at,
      last_sign_in,
      status,
      banned_until,
      banned_reason,
      memberships (
        role_id,
        roles (
          name
        ),
        tenants (
          id,
          name,
          subscriptions (
            status,
            plan_id
          )
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat data pengguna server-side:", error.message);
    return [];
  }

  const { data: dbPlans } = await (await planRepository(supabaseAdmin)).query().select("id, name");
  const planNameMap = new Map<string, string>((dbPlans ?? []).map((p: any) => [p.id, p.name]));

  const formattedUsers: User[] = (profiles || []).map((prof: any, index: number) => {
    const fullName = prof.full_name || "Unknown User";
    const firstMembership = prof.memberships?.[0];
    const tenant = firstMembership?.tenants;
    const firstSub = tenant?.subscriptions?.[0];

    const planName = planNameMap.get(firstSub?.plan_id) || "Free";
    const statusVal = firstSub?.status === "active" ? "active" : "inactive";

    return {
      id: index + 1,
      dbId: prof.id,
      firstName: fullName.split(" ")[0] || "",
      lastName: fullName.split(" ").slice(1).join(" ") || "",
      name: fullName,
      role: firstMembership?.roles?.name || "Member",
      plan_name: planName,
      email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      country: "United States",
      status: statusVal as "active" | "inactive" | "pending",
      image: prof.avatar || `https://i.pravatar.cc/150?img=${(index % 70) + 1}`,
      created_at: prof.created_at,
      lastSignIn: prof.last_sign_in || null,
      accountStatus: (prof.status as User["accountStatus"]) || "active",
      bannedUntil: prof.banned_until || null,
      bannedReason: prof.banned_reason || null
      // Kolom updated_at dihilangkan dari sini
    };
  });

  return formattedUsers;
}
