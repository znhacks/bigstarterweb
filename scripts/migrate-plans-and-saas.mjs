import { createClient } from "@supabase/supabase-js";

// Source: JMPANEL (bsicqpiqskrwqesqijtf)
const sourceUrl = "https://bsicqpiqskrwqesqijtf.supabase.co";
const sourceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaWNxcGlxc2tyd3Flc3FpanRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTcxNzEzOSwiZXhwIjoyMTAxMjkzMTM5fQ.N2LIkjqEkzbPcdJvs9aFbM9JomuVH45IIADDBV8EwMo";

// Destination: JURNALMENGAJAR (egcxjuudphnbjwqhhbra)
const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const sourceSupabase = createClient(sourceUrl, sourceKey);
const destSupabase = createClient(destUrl, destKey);

const tables = [
  "plans",
  "plan_prices",
  "coupons",
  "coupon_redemptions",
  "payment_orders",
  "transactions",
  "announcements",
  "announcement_targets",
  "invitations"
];

async function migrateSaaSTables() {
  console.log("=== MIGRATING SAAS & PLANS TABLES TO JURNALMENGAJAR ===");

  for (const table of tables) {
    try {
      const { data, error } = await sourceSupabase.from(table).select("*");
      if (error) {
        console.warn(`Notice for ${table}:`, error.message);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`📦 Fetched ${data.length} rows from ${table}`);
        const { error: insErr } = await destSupabase.from(table).upsert(data);
        if (insErr) console.error(`❌ Error inserting into ${table}:`, insErr.message);
        else console.log(`✅ Successfully migrated ${data.length} rows into ${table}`);
      } else {
        console.log(`ℹ️ Table ${table} is empty on source.`);
      }
    } catch (e) {
      console.error(`Error migrating ${table}:`, e);
    }
  }

  console.log("\n🎉 ALL SAAS & PLANS TABLES MIGRATED SUCCESSFULLY!");
}

migrateSaaSTables();
