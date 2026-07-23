// scripts/backfill-transactions.ts
//
// One-time backfill: mengoreksi transaksi provider mata-uang-asing (PayPal/Stripe/Paddle/Lemon)
// yang KARENA BUG LAMA tersimpan dgn currency='IDR' padahal amount-nya dalam USD (mis. 1.25),
// dan amount_in_idr NULL. Hasilnya tampil "Rp 1,25" alih-alih "$1.25 (≈ Rp 19.750)".
//
// Koreksi: currency -> 'USD' (asumsi provider asing charge USD), amount_in_idr = amount * rate.
//
// === CARA PAKAI ===
// 1. Pastikan env termuat (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXCHANGERATE_API_KEY).
// 2. DRY-RUN (default, tidak menulis):
//      npx tsx --env-file=.env scripts/backfill-transactions.ts
// 3. APPLY (benar-benar menulis ke DB):
//      npx tsx --env-file=.env scripts/backfill-transactions.ts --apply
//
// Idempoten: hanya memproses baris dgn amount_in_idr IS NULL (jalankan ulang aman).

import { createClient } from "@supabase/supabase-js";
import { convertToIdr } from "../services/exchange-rate";
import { transactionRepository } from "@/supabase/repositories/transactions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib di-set di env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Provider yang charge dalam valuta asing (bug lama: currency keliru 'IDR').
const FOREIGN_PROVIDERS = ["paypal", "stripe", "paddle", "lemonsqueezy"];
const ASSUMED_CURRENCY = "USD"; // PayPal/Stripe/Paddle/Lemon charge USD

async function main() {
  const apply = process.argv.includes("--apply");

  const transactionRepo = await transactionRepository(supabase);
  const { data, error } = await transactionRepo
    .query()
    .select("id, amount, currency, provider, created_at")
    .in("provider", FOREIGN_PROVIDERS)
    .eq("currency", "IDR") // keliru (seharusnya USD)
    .is("amount_in_idr", null); // belum dikoreksi

  if (error) throw error;
  const rows = data ?? [];
  console.log(`Ditemukan ${rows.length} transaksi provider-asing dgn currency keliru 'IDR' & amount_in_idr NULL.`);

  if (rows.length === 0) {
    console.log("Tidak ada yang perlu dikoreksi. Selesai.");
    return;
  }

  // Ambil rate SEKALI (idr per 1 unit ASSUMED_CURRENCY). Approx current rate (bukan historis).
  const conv = await convertToIdr(1, ASSUMED_CURRENCY);
  console.log(`Rate dipakai: 1 ${ASSUMED_CURRENCY} = ${conv.rate} IDR (via ${conv.providerUsed})`);

  const preview = rows.slice(0, 10);
  console.log("\n--- Preview (maks 10) ---");
  for (const tx of preview) {
    const idr = Number(tx.amount) * conv.rate;
    console.log(
      `[DRY] id=${tx.id} | provider=${tx.provider} | amount=${tx.amount} ` +
        `-> currency=${ASSUMED_CURRENCY}, amount_in_idr=${idr.toFixed(2)} | created=${tx.created_at}`
    );
  }

  if (!apply) {
    console.log("\nDry-run (tidak menulis). Jalankan dgn --apply untuk menyimpan.");
    return;
  }

  console.log("\nMenerapkan koreksi...");
  let updated = 0;
  let failed = 0;
  for (const tx of rows) {
    const amountInIdr = parseFloat((Number(tx.amount) * conv.rate).toFixed(2));
    const { error: updErr } = await transactionRepo
      .query()
      .update({
        currency: ASSUMED_CURRENCY,
        amount_in_idr: amountInIdr,
        exchange_rate: conv.rate,
        exchange_api_used: conv.providerUsed
      })
      .eq("id", tx.id)
      .is("amount_in_idr", null); // guard idempotensi tambahan

    if (updErr) {
      console.error(`  FAIL ${tx.id}: ${updErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`\nSelesai. Diperbarui: ${updated}, gagal: ${failed} (total: ${rows.length}).`);
}

main().catch((e) => {
  console.error("Backfill error:", e);
  process.exit(1);
});
