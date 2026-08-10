import { createClient } from "@supabase/supabase-js";

const url = "https://egcxjuudphnbjwqhhbra.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(url, key);

async function recreateCleanUsers() {
  console.log("=== CREATING CLEAN AUTH USERS ===");

  // 1. Create jordy@bigstarter.com
  const { data: user1, error: err1 } = await supabase.auth.signUp({
    email: "jordy@bigstarter.com",
    password: "password123"
  });

  if (err1) {
    console.error("❌ Failed to create jordy@bigstarter.com:", err1.message);
  } else {
    console.log("✅ Created jordy@bigstarter.com with ID:", user1.user?.id);

    if (user1.user?.id) {
      const uId = user1.user.id;

      // Upsert profile
      const { error: pErr } = await supabase.from("profiles").upsert({
        id: uId,
        full_name: "Jordy",
        is_superadmin: true,
        status: "active"
      });
      if (pErr) console.error("Profile error:", pErr.message);
      else console.log("Profile created for Jordy!");

      // Find main tenant
      const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", "jurnal-mengajar").maybeSingle();
      const { data: role } = await supabase.from("roles").select("id").eq("name", "Owner").maybeSingle();

      if (tenant && role) {
        const { error: mErr } = await supabase.from("memberships").upsert({
          user_id: uId,
          tenant_id: tenant.id,
          role_id: role.id
        });
        if (mErr) console.error("Membership error:", mErr.message);
        else console.log("Membership attached to Jurnal Mengajar!");
      }
    }
  }

  // 2. Create admin11mlg@jurnal.com
  const { data: user2, error: err2 } = await supabase.auth.signUp({
    email: "admin11mlg@jurnal.com",
    password: "password123"
  });

  if (err2) {
    console.error("❌ Failed to create admin11mlg@jurnal.com:", err2.message);
  } else {
    console.log("✅ Created admin11mlg@jurnal.com with ID:", user2.user?.id);

    if (user2.user?.id) {
      const uId = user2.user.id;

      const { error: pErr } = await supabase.from("profiles").upsert({
        id: uId,
        full_name: "Admin SMKN 11 Malang",
        is_superadmin: false,
        status: "active"
      });
      if (pErr) console.error("Profile error:", pErr.message);

      const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", "jurnal-mengajar").maybeSingle();
      const { data: role } = await supabase.from("roles").select("id").eq("name", "Owner").maybeSingle();

      if (tenant && role) {
        const { error: mErr } = await supabase.from("memberships").upsert({
          user_id: uId,
          tenant_id: tenant.id,
          role_id: role.id
        });
        if (mErr) console.error("Membership error:", mErr.message);
      }
    }
  }

  console.log("\n=== TESTING LOGIN FOR JORDY ===");
  const loginRes = await supabase.auth.signInWithPassword({
    email: "jordy@bigstarter.com",
    password: "password123"
  });

  if (loginRes.error) {
    console.error("❌ Login failed:", loginRes.error.message);
  } else {
    console.log("🎉 LOGIN SUCCESSFUL FOR JORDY!", loginRes.data.user?.email);
  }
}

recreateCleanUsers();
