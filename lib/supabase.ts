import { createBrowserClient } from "@supabase/ssr";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bsicqpiqskrwqesqijtf.supabase.co";

const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaWNxcGlxc2tyd3Flc3FpanRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTcxMzksImV4cCI6MjEwMTI5MzEzOX0.JDm93ruPLqJL-xwp48G4e7IQJLyQKPf5A0HwmoUjrwM";

export const supabase = createBrowserClient(url, key);
