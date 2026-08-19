const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: authLogs, error: e1 } = await supabaseAdmin
    .schema("auth")
    .from("audit_log_entries")
    .select("id, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  console.log("AUTH LOGS:");
  console.dir(authLogs, { depth: null });

  const { data: dbLogs, error: e2 } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);
    
  console.log("\nPUBLIC LOGS:");
  console.dir(dbLogs, { depth: null });
}

check();
