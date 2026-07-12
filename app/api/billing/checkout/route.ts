// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { createClient } from "@supabase/supabase-js";

// Memaksa rute dievaluasi secara dinamis saat runtime (mencegah error build statis)
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Inisialisasi Supabase khusus sisi server dengan bypass RLS (Lazy Initialization)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
  );

  try {
    const body = await req.json();
    const { planId, interval, provider, tenantId, successUrl, cancelUrl } = body;

    // 1. Dapatkan data pengguna aktif untuk memastikan otorisasi
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 2. Ambil adapter pembayaran yang sesuai secara dinamis menggunakan Factory
    const paymentProvider = PaymentFactory.getProvider(provider);

    // 3. Eksekusi pembuatan sesi pembayaran di sisi gateway
    const session = await paymentProvider.createCheckoutSession({
      tenantId,
      userId: user.id,
      userEmail: user.email || "",
      planId,
      interval,
      successUrl: successUrl || `${req.headers.get("origin")}/dashboard/billing?success=true`,
      cancelUrl: cancelUrl || `${req.headers.get("origin")}/dashboard/billing?canceled=true`
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
