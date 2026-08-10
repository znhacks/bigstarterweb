import { createClient } from "@supabase/supabase-js";

const url = "https://egcxjuudphnbjwqhhbra.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const supabase = createClient(url, key);

async function testSignUp() {
  console.log("Testing signUp on egcxjuudphnbjwqhhbra...");
  const testEmail = `testuser_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: "TestPassword123!"
  });

  console.log("SignUp error:", error);
  console.log("SignUp data:", data);

  if (data?.user) {
    console.log("Testing signInWithPassword with newly created user...");
    const loginRes = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: "TestPassword123!"
    });
    console.log("Newly created user login error:", loginRes.error);
    console.log("Newly created user login data:", loginRes.data);
  }
}

testSignUp();
