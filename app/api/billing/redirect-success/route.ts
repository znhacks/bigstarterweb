import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { paymentOrderRepository } from "@/supabase/repositories/payment-orders";
import { tenantRepository } from "@/supabase/repositories/tenants";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const transactionId = searchParams.get("transaction_id");
  const paymentOrder = await paymentOrderRepository(supabaseAdmin);
  const tenantRepo = await tenantRepository(supabaseAdmin);

  if (!transactionId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  try {
    const { data: order, error: orderError } = await paymentOrder
      .query()
      .select("tenant_id")
      .eq("provider_order_id", transactionId)
      .maybeSingle();

    if (orderError) {
      console.error("[redirect-success] Error fetching payment order:", orderError.message);
    }

    if (order?.tenant_id) {
      const { data: tenant, error: tenantError } = await tenantRepo
        .query()
        .select("slug")
        .eq("id", order.tenant_id)
        .maybeSingle();

      if (tenantError) {
        console.error("[redirect-success] Error fetching tenant slug:", tenantError.message);
      }

      if (tenant?.slug) {
        const targetUrl = new URL(`/${tenant.slug}/organization/pricing`, req.url);
        targetUrl.searchParams.set("success", "true");

        return NextResponse.redirect(targetUrl);
      }
    }
  } catch (error: any) {
    console.error("[redirect-success] Gagal memproses redirect perantara:", error.message || error);
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
