import { createClient } from "@supabase/supabase-js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { profileRepository } from "@/supabase/repositories/profiles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib di-set di env.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const ask = (rl: readline.Interface, q: string) => rl.question(q).then((a) => a.trim());

async function main() {
  const rl = readline.createInterface({ input, output });
  try {
    console.log("Let's create a new user for your application!");

    const email = await ask(rl, "Email: ");
    if (!email || !email.includes("@")) {
      console.error("Email tidak valid.");
      process.exit(1);
    }

    const password = await ask(rl, "Password (min 8 karakter): ");
    if (!password || password.length < 8) {
      console.error("Password minimal 8 karakter.");
      process.exit(1);
    }

    const fullName = await ask(rl, "Nama lengkap (opsional): ");
    const superAns = (await ask(rl, "Jadikan superadmin? (y/N): ")).toLowerCase();
    const isSuperadmin = superAns === "y" || superAns === "yes";

    console.log(`\nMembuat user: ${email} (superadmin=${isSuperadmin})...`);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined
    });
    if (authErr) throw new Error(`createUser: ${authErr.message}`);
    const userId = authData.user.id;

    const profileRepo = await profileRepository(supabaseAdmin);
    const { error: profErr } = await profileRepo.insert({
      id: userId,
      full_name: fullName || null,
      status: "active"
    });
    if (profErr) {
      console.warn(`Profile insert gagal (${profErr.message}); menghapus auth user...`);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`profile insert: ${profErr.message}`);
    }

    if (isSuperadmin) {
      const { error: saErr } = await profileRepo.update(userId, { is_superadmin: true });
      if (saErr) console.warn(`Warn: gagal set profiles.is_superadmin (${saErr.message})`);

      const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { role: "superadmin" }
      });
      if (metaErr) console.warn(`Warn: gagal set app_metadata.role (${metaErr.message})`);
    }

    console.log(`\n✓ User dibuat.\n  id=${userId}\n  email=${email}\n  superadmin=${isSuperadmin}`);
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  console.error("Create-user error:", e?.message || e);
  process.exit(1);
});
