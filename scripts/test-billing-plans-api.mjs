import { createClient } from "@supabase/supabase-js";

const url = "https://egcxjuudphnbjwqhhbra.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(url, key);

async function testPlans() {
  console.log("Fetching plans from public.plans in egcxjuudphnbjwqhhbra...");
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("❌ Error fetching plans:", error.message);
  } else {
    console.log(`🎉 SUCCESS! Fetched ${plans?.length} active plans:`);
    plans?.forEach((p) => {
      console.log(`- [${p.id}] ${p.name?.id || p.name?.en} (sort: ${p.sort_order})`);
    });
  }
}

testPlans();
