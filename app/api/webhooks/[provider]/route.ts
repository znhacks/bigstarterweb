// app/api/webhooks/[provider]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { paypalDriver } from "@/lib/billing/providers/paypal";
import { BillingProviderDriver } from "@/lib/billing/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map semua driver terdaftar
const drivers: Record<string, BillingProviderDriver> = {
  paypal: paypalDriver
};

export async function POST(
  req: Request,
  // Perubahan tipe data: params dibungkus dalam Promise untuk Next.js 15
  { params }: { params: Promise<{ provider: string }> }
) {
  // Mengekstrak parameter secara asinkronus menggunakan await
  const { provider } = await params;
  const driver = drivers[provider];

  if (!driver) {
    return NextResponse.json({ error: `Provider ${provider} tidak didukung.` }, { status: 400 });
  }

  try {
    // 1. Beberapa provider seperti Stripe membutuhkan raw text untuk verifikasi signature
    const rawPayload = provider === "stripe" ? await req.text() : await req.json();

    // 2. Jalankan verifikasi terpadu melalui Driver Layer
    const result = await driver.verifyPayload(rawPayload, req.headers);

    if (!result.success) {
      throw new Error("Gagal memverifikasi payload.");
    }

    // 3. --- IDEMPOTENCY CHECK ---
    const { data: existingTx } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("order_id", result.orderId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ message: "Transaksi sudah pernah diproses." }, { status: 200 });
    }

    // 4. --- SATU LOGIKA UPDATE DATABASE UNTUK SEMUA PROVIDER ---
    // Simpan Transaksi Keuangan
    const { error: txError } = await supabaseAdmin.from("transactions").insert({
      tenant_id: result.tenantId,
      amount: result.amount,
      plan_name: result.planId,
      order_id: result.orderId,
      status: "completed"
    });

    if (txError) throw txError;

    // 2. Tentukan Tanggal Berakhir (ends_at) Berdasarkan Tanggal Tagihan Berikutnya
    const endsAt = result.nextBillingTime
      ? new Date(result.nextBillingTime).toISOString()
      : new Date(
          Date.now() + (result.billingCycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString();

    // 3. Daftarkan / Perbarui Paket Langganan Berulang Aktif Organisasi
    const { error: subError } = await supabaseAdmin.from("subscriptions").upsert(
      {
        tenant_id: result.tenantId,
        plan_id: result.planId,
        status: "active",
        cancel_at_period_end: false, // FALSE: Berlangganan otomatis diperpanjang tiap bulan
        starts_at: new Date().toISOString(),
        ends_at: endsAt,
        provider_subscription_id: result.orderId, // Simpan Subscription ID asli
        updated_at: new Date().toISOString()
      },
      { onConflict: "tenant_id" }
    );

    if (subError) throw subError;

    return NextResponse.json(
      { success: true, message: "Database updated securely" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(`Gagal memproses webhook ${provider}:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
