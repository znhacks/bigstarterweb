import { createClient } from "@supabase/supabase-js";

const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(destUrl, destAnonKey);

async function testCleanCities() {
  console.log("=== TESTING CLEAN CITIES FOR INDONESIA ===");

  // Fetch all cities for Aceh (state_id = 1822)
  const { data: rawCities } = await supabase
    .from("cities")
    .select("id, name")
    .eq("state_id", 1822)
    .order("name", { ascending: true })
    .range(0, 2000);

  console.log(`Raw cities in Aceh: ${rawCities?.length}`);

  // Filter cities for Indonesia: keep "Kabupaten ...", "Kota ...", or cities that have subdistricts
  const officialCities = [];
  for (const city of rawCities || []) {
    const isOfficialName = city.name.startsWith("Kabupaten ") || city.name.startsWith("Kota ");
    if (isOfficialName) {
      officialCities.push(city);
    } else {
      // Check if it has subdistricts
      const { count } = await supabase.from("kecamatan").select("*", { count: "exact", head: true }).eq("id_kab_kota", city.id);
      if (count && count > 0) {
        officialCities.push(city);
      }
    }
  }

  console.log(`Cleaned official cities in Aceh: ${officialCities.length}`);
  console.log("Official Aceh cities:", officialCities.map(c => c.name));
}

testCleanCities();
