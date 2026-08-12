import { createClient } from "@supabase/supabase-js";

const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(destUrl, destAnonKey);

async function testOfficialCities() {
  console.log("=== TESTING OFFICIAL KABUPATEN/KOTA CITIES FOR JAWA TIMUR (state_id = 1827) ===");
  
  // 1. Fetch cities for Jawa Timur (state_id = 1827)
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .eq("state_id", 1827)
    .order("name", { ascending: true })
    .range(0, 2000);

  console.log(`Total cities for Jawa Timur: ${cities?.length}`);

  // Find cities that have "Kabupaten" or "Kota" in their name
  const officialCities = cities?.filter(c => c.name.startsWith("Kabupaten ") || c.name.startsWith("Kota ")) || [];
  console.log(`Official Kabupaten/Kota count in Jawa Timur: ${officialCities.length}`);

  for (const city of officialCities.slice(0, 10)) {
    const { data: kecs } = await supabase
      .from("kecamatan")
      .select("id, nama_kecamatan")
      .eq("id_kab_kota", city.id)
      .order("nama_kecamatan", { ascending: true });
    
    console.log(`  ✅ '${city.name}' (id=${city.id}): ${kecs?.length} kecamatan (${kecs?.slice(0, 3).map(k => k.nama_kecamatan).join(", ")})`);
  }

  console.log("\n=== TESTING DIRECT KECAMATAN BY PROVINCE (id_provinsi = 1827) ===");
  const { data: kecsByProv } = await supabase
    .from("kecamatan")
    .select("id, nama_kecamatan, id_kab_kota")
    .eq("id_provinsi", 1827)
    .order("nama_kecamatan", { ascending: true })
    .range(0, 2000);
  
  console.log(`Total kecamatan in Jawa Timur (id_provinsi = 1827): ${kecsByProv?.length} kecamatan`);
}

testOfficialCities();
