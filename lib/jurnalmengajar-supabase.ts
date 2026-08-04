import { createClient } from "@supabase/supabase-js";

const JURNALMENGAJAR_URL =
  process.env.NEXT_PUBLIC_JURNALMENGAJAR_SUPABASE_URL ||
  "https://egcxjuudphnbjwqhhbra.supabase.co";

const JURNALMENGAJAR_ANON_KEY =
  process.env.NEXT_PUBLIC_JURNALMENGAJAR_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

export const jurnalMengajarSupabase = createClient(
  JURNALMENGAJAR_URL,
  JURNALMENGAJAR_ANON_KEY
);
