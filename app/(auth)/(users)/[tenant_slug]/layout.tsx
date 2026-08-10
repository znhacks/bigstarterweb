import { createClient } from "@/lib/supabase/server";
import { tenantConfig } from "@/config/tenant";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { redirect } from "next/navigation";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { ShieldAlert } from "lucide-react";

export default async function TenantLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;

  // ── Member limit guard (only check for authenticated users) ──
  const limit = tenantConfig.organizations.freeMemberLimit;
  if (limit > 0) {
    try {
      const supabase = await createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        // Ambil tenant_id dari slug
        const { data: tenant } = await supabaseAdmin
          .from("tenants")
          .select("id")
          .ilike("slug", tenant_slug)
          .maybeSingle();

        if (tenant) {
          // Hitung anggota aktual
          const { count: memberCount } = await supabaseAdmin
            .from("memberships")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);

          // Cek apakah user ini adalah anggota tenant ini
          const { data: myMembership } = await supabaseAdmin
            .from("memberships")
            .select("id")
            .eq("tenant_id", tenant.id)
            .eq("user_id", user.id)
            .maybeSingle();

          // Jika user bukan anggota DAN tenant sudah penuh → tolak
          if (!myMembership && (memberCount ?? 0) >= limit) {
            return (
              <div className="mx-auto w-full max-w-md px-4 py-16">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-3">
                  <div className="flex justify-center">
                    <ShieldAlert className="h-10 w-10 text-amber-500 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-bold">Batas Anggota Tercapai</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Organisasi ini sudah mencapai batas maksimal{" "}
                    <span className="font-semibold text-amber-600">{limit} anggota</span> untuk
                    paket <span className="font-semibold">Free</span>. Hubungi pemilik organisasi
                    untuk meningkatkan paket ke Enterprise agar dapat menambah lebih banyak anggota.
                  </p>
                  <p className="text-xs text-muted-foreground/70 pt-1">
                    Anggota saat ini: {memberCount ?? 0} / {limit}
                  </p>
                </div>
              </div>
            );
          }
        }
      }
    } catch {
      // Jika terjadi error, lanjutkan saja (jangan block akses karena error sistem)
    }
  }
  // ─────────────────────────────────────────────────────────────

  return <SubscriptionGuard>{children}</SubscriptionGuard>;
}
