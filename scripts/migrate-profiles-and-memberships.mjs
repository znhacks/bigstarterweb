import { createClient } from "@supabase/supabase-js";

// Source: JMPANEL (bsicqpiqskrwqesqijtf)
const sourceUrl = "https://bsicqpiqskrwqesqijtf.supabase.co";
const sourceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaWNxcGlxc2tyd3Flc3FpanRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTcxNzEzOSwiZXhwIjoyMTAxMjkzMTM5fQ.N2LIkjqEkzbPcdJvs9aFbM9JomuVH45IIADDBV8EwMo";

// Destination: JURNALMENGAJAR (egcxjuudphnbjwqhhbra)
const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const sourceSupabase = createClient(sourceUrl, sourceKey);
const destSupabase = createClient(destUrl, destKey);

const userIdMap = {
  "3756802a-7e66-41e2-9442-4d664c95cc28": "1813ca0d-b1d2-4ffa-857f-41f023f5e9f1", // jxsnigger@gmail.com
  "ff8b3ac4-b698-4249-8cd4-a13463038f58": "6a03aa40-b875-4209-81cb-84f8028c9fdc"  // hydrogz7@gmail.com
};

async function runProfilesAndMemberships() {
  console.log("=== MIGRATING PROFILES AND MEMBERSHIPS ===");

  // 1. Migrate Profiles
  const { data: profiles } = await sourceSupabase.from("profiles").select("*");
  if (profiles && profiles.length > 0) {
    console.log(`📦 Fetched ${profiles.length} profiles from source.`);
    for (const p of profiles) {
      const mappedId = userIdMap[p.id] || p.id;
      const payload = { ...p, id: mappedId };
      const { error } = await destSupabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) console.error(`❌ Profile ${p.id} (${p.full_name}) error:`, error.message);
      else console.log(`✅ Profile ${p.full_name || mappedId} migrated successfully!`);
    }
  }

  // 2. Migrate Memberships
  const { data: memberships } = await sourceSupabase.from("memberships").select("*");
  if (memberships && memberships.length > 0) {
    console.log(`📦 Fetched ${memberships.length} memberships from source.`);
    for (const m of memberships) {
      const mappedUserId = userIdMap[m.user_id] || m.user_id;
      const payload = { ...m, user_id: mappedUserId };
      const { error } = await destSupabase.from("memberships").upsert(payload, { onConflict: "id" });
      if (error) console.error(`❌ Membership ${m.id} error:`, error.message);
      else console.log(`✅ Membership ${m.id} (user: ${mappedUserId}, tenant: ${m.tenant_id}) migrated!`);
    }
  }
}

runProfilesAndMemberships();
