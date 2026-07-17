// sync-rbac.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { syncRbacToDb } from "./config/rbac";

// Load environment variables dari file .env lokal
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Gunakan service role agar bypass RLS

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  const result = await syncRbacToDb(supabaseAdmin);
  if (result.success) {
    console.log("RBAC Sync complete.");
    process.exit(0);
  } else {
    console.error("RBAC Sync failed:", result.error);
    process.exit(1);
  }
}

run();
