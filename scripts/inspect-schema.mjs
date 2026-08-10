import { createClient } from "@supabase/supabase-js";

// Source: JMPANEL (bsicqpiqskrwqesqijtf)
const sourceUrl = "https://bsicqpiqskrwqesqijtf.supabase.co";
const sourceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaWNxcGlxc2tyd3Flc3FpanRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTcxNzEzOSwiZXhwIjoyMTAxMjkzMTM5fQ.N2LIkjqEkzbPcdJvs9aFbM9JomuVH45IIADDBV8EwMo";

// Destination: JURNALMENGAJAR (egcxjuudphnbjwqhhbra)
const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const sourceSupabase = createClient(sourceUrl, sourceKey);
const destSupabase = createClient(destUrl, destKey);

async function inspectSchema() {
  console.log("=== INSPECTING JURNALMENGAJAR TABLES ===");
  const testTables = [
    "profiles", "users", "tenants", "organizations", "memberships",
    "roles", "permissions", "subscriptions", "schools", "school_code",
    "jurnal", "jurnals", "absensi", "guru", "siswa"
  ];

  for (const t of testTables) {
    const { data, error } = await destSupabase.from(t).select("*").limit(1);
    if (error) {
      console.log(`❌ Table [${t}]: ${error.message}`);
    } else {
      console.log(`✅ Table [${t}]: EXISTS (${data?.length} sample row)`);
    }
  }

  console.log("\n=== INSPECTING JMPANEL DATA TO MIGRATE ===");
  const sourceTables = ["tenants", "profiles", "memberships", "roles", "permissions", "role_permissions", "tenant_schools", "subscriptions", "inquiries"];
  for (const t of sourceTables) {
    const { data, error, count } = await sourceSupabase.from(t).select("*", { count: "exact" });
    if (error) {
      console.log(`❌ Source [${t}]: ${error.message}`);
    } else {
      console.log(`📦 Source [${t}]: ${data?.length} rows`);
      if (data && data.length > 0) {
        console.log(`   Sample row keys:`, Object.keys(data[0]));
      }
    }
  }
}

inspectSchema();
