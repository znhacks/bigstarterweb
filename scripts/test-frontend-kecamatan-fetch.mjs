import { createClient } from "@supabase/supabase-js";

// Anon key used in frontend lib/supabase.ts
const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(destUrl, destAnonKey);

async function testFrontendFetch() {
  console.log("=== TESTING FRONTEND KECAMATAN FETCH WITH ANON KEY ===");

  // 1. Test count of kecamatan
  const { count, error: countErr } = await supabase.from("kecamatan").select("*", { count: "exact", head: true });
  console.log("Kecamatan total count via anon key:", countErr ? `❌ ${countErr.message}` : `${count} rows`);

  // 2. Fetch sample cities in East Java (Jawa Timur state_id = 1827)
  const { data: cities } = await supabase.from("cities").select("id, name").eq("state_id", 1827).order("name", { ascending: true });
  console.log(`Cities in Jawa Timur: ${cities?.length} cities`);
  
  if (cities && cities.length > 0) {
    for (const city of cities.slice(0, 10)) {
      const { data: kecs, error: kecErr } = await supabase
        .from("kecamatan")
        .select("id, nama_kecamatan")
        .eq("id_kab_kota", city.id)
        .order("nama_kecamatan", { ascending: true })
        .range(0, 2000);
      
      console.log(`  City '${city.name}' (id=${city.id}): ${kecErr ? `❌ ${kecErr.message}` : `${kecs?.length} kecamatan`}`);
      if (kecs && kecs.length > 0) {
        console.log(`    -> Sample: ${kecs.slice(0, 3).map(k => k.nama_kecamatan).join(", ")}`);
      }
    }
  }

  // 3. Test Aceh (state_id = 1822)
  const { data: acehCities } = await supabase.from("cities").select("id, name").eq("state_id", 1822).order("name", { ascending: true });
  console.log(`\nCities in Aceh: ${acehCities?.length} cities`);
  if (acehCities && acehCities.length > 0) {
    for (const city of acehCities.slice(0, 10)) {
      const { data: kecs, error: kecErr } = await supabase
        .from("kecamatan")
        .select("id, nama_kecamatan")
        .eq("id_kab_kota", city.id)
        .order("nama_kecamatan", { ascending: true })
        .range(0, 2000);
      
      console.log(`  City '${city.name}' (id=${city.id}): ${kecErr ? `❌ ${kecErr.message}` : `${kecs?.length} kecamatan`}`);
    }
  }
}

testFrontendFetch();
