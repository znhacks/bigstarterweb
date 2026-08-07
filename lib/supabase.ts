import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export const supabase = createBrowserClient(
  url,
  key,
  {
    auth: {
      experimental: {
        passkey: true // <-- Aktifkan di Client
      }
    }
  }
);
