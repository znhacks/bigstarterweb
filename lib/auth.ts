// lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    // Jika menggunakan Supabase, disarankan mengaktifkan SSL di produksi
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  }),
  emailAndPassword: {
    enabled: true // Mengaktifkan login dengan email & password
  }
});
