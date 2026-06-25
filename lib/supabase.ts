import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Menggunakan createBrowserClient dari @supabase/ssr
// agar token otomatis disalin dari LocalStorage ke Cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
