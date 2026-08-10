import { createClient } from "@supabase/supabase-js";

// Source: JMPANEL (bsicqpiqskrwqesqijtf)
const sourceUrl = "https://bsicqpiqskrwqesqijtf.supabase.co";
const sourceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaWNxcGlxc2tyd3Flc3FpanRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTcxNzEzOSwiZXhwIjoyMTAxMjkzMTM5fQ.N2LIkjqEkzbPcdJvs9aFbM9JomuVH45IIADDBV8EwMo";

// Destination: JURNALMENGAJAR (egcxjuudphnbjwqhhbra)
const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const sourceSupabase = createClient(sourceUrl, sourceKey);
const destSupabase = createClient(destUrl, destKey);

async function startMigration() {
  console.log("=========================================");
  console.log("STARTING DATA MIGRATION: JMPANEL -> JURNALMENGAJAR");
  console.log("=========================================\n");

  const tableConfigs = [
    { name: "roles", conflict: "id" },
    { name: "permissions", conflict: "id" },
    { name: "role_permissions", conflict: "role_id, permission_id" },
    { name: "tenants", conflict: "id" },
    { name: "profiles", conflict: "id" },
    { name: "memberships", conflict: "id" },
    { name: "tenant_schools", conflict: "id" },
    { name: "subscriptions", conflict: "id" }
  ];

  for (const cfg of tableConfigs) {
    const table = cfg.name;
    console.log(`\n---> Migrating table: [${table}]`);
    
    // 1. Fetch data from source
    const { data: rows, error: fetchErr } = await sourceSupabase.from(table).select("*");
    if (fetchErr) {
      console.error(`❌ [${table}] Fetch error from source:`, fetchErr.message);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`ℹ️ [${table}] No rows found in source database.`);
      continue;
    }

    console.log(`📦 [${table}] Fetched ${rows.length} rows from source.`);

    // 2. Upsert data into destination
    const { data: inserted, error: insertErr } = await destSupabase.from(table).upsert(rows, { onConflict: cfg.conflict });
    if (insertErr) {
      console.error(`❌ [${table}] Insert error in destination:`, insertErr.message);
      let successCount = 0;
      for (const row of rows) {
        const { error: singleErr } = await destSupabase.from(table).upsert(row, { onConflict: cfg.conflict });
        if (!singleErr) successCount++;
      }
      console.log(`⚠️ [${table}] Fallback single insert completed: ${successCount}/${rows.length} rows inserted.`);
    } else {
      console.log(`✅ [${table}] Successfully migrated ${rows.length} rows to destination!`);
    }
  }

  console.log("\n=========================================");
  console.log("MIGRATION FINISHED!");
  console.log("=========================================");
}

startMigration();
