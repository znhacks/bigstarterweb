import { createClient } from "@supabase/supabase-js";

const url = "https://egcxjuudphnbjwqhhbra.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(url, key);

async function testLogin() {
  console.log("Testing signInWithPassword on egcxjuudphnbjwqhhbra...");
  
  // Test email login
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "jordy@bigstarter.com",
    password: "wrongpassword"
  });

  console.log("Response error:", error);
  console.log("Response data:", data);
}

testLogin();
