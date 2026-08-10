import { createClient } from "@supabase/supabase-js";

// Source: JMPANEL (bsicqpiqskrwqesqijtf)
const sourceUrl = "https://bsicqpiqskrwqesqijtf.supabase.co";
const sourceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaWNxcGlxc2tyd3Flc3FpanRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTcxNzEzOSwiZXhwIjoyMTAxMjkzMTM5fQ.N2LIkjqEkzbPcdJvs9aFbM9JomuVH45IIADDBV8EwMo";

// Destination: JURNALMENGAJAR (egcxjuudphnbjwqhhbra)
const destUrl = "https://egcxjuudphnbjwqhhbra.supabase.co";
const destKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnY3hqdXVkcGhuYmp3cWhoYnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTIzNDAsImV4cCI6MjA5NjgyODM0MH0.cmSDtVTxAcouchEt38uNZXyKvR860fzsa9TKxVhfVtw";

const sourceSupabase = createClient(sourceUrl, sourceKey);
const destSupabase = createClient(destUrl, destKey);

const users = [
  {
    id: '3756802a-7e66-41e2-9442-4d664c95cc28',
    email: 'jxsnigger@gmail.com',
    encrypted_password: null,
    email_confirmed_at: '2026-08-04 02:34:50.781628+00',
    raw_app_meta_data: { provider: 'google', providers: ['google'] },
    raw_user_meta_data: {
      iss: 'https://accounts.google.com',
      sub: '101225672143304050362',
      name: 'CutieePatootie',
      email: 'jxsnigger@gmail.com',
      picture: 'https://lh3.googleusercontent.com/a/ACg8ocJaEEVqG1OFrb0cPZSlGLyN3vwKVy9GQfvudf0Ne4g-7J8LlwI=s96-c',
      full_name: 'CutieePatootie',
      avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocJaEEVqG1OFrb0cPZSlGLyN3vwKVy9GQfvudf0Ne4g-7J8LlwI=s96-c',
      provider_id: '101225672143304050362',
      email_verified: true,
      phone_verified: false
    },
    created_at: '2026-08-04 02:34:50.755629+00',
    updated_at: '2026-08-10 07:06:08.585208+00',
    role: 'authenticated',
    aud: 'authenticated'
  },
  {
    id: 'd9ac28ee-3a1d-4fce-b33a-f144bfb0024c',
    email: 'jordy@bigstarter.com',
    encrypted_password: '$2a$10$YYBUqRILuRxWc5T7WXY.ou7MVZkhhMwKTzflkKSzXVbdqMVgoYxBi',
    email_confirmed_at: '2026-08-03 05:51:01.525684+00',
    raw_app_meta_data: { provider: 'email', providers: ['email'] },
    raw_user_meta_data: {
      sub: 'd9ac28ee-3a1d-4fce-b33a-f144bfb0024c',
      email: 'jordy@bigstarter.com',
      email_verified: true,
      phone_verified: false
    },
    created_at: '2026-08-03 05:51:01.504921+00',
    updated_at: '2026-08-10 08:44:32.289972+00',
    role: 'authenticated',
    aud: 'authenticated'
  },
  {
    id: '3f040bae-06db-4d47-bc0e-f0ca69f291d2',
    email: 'admin11mlg@jurnal.com',
    encrypted_password: '$2a$10$Cp0NBZnANsq6N3M4yfZlB.JTMngYY3GXHRKR06GSBD9T32/JFxGby',
    email_confirmed_at: '2026-08-10 04:04:36.348903+00',
    raw_app_meta_data: { provider: 'email', providers: ['email'] },
    raw_user_meta_data: {
      sub: '3f040bae-06db-4d47-bc0e-f0ca69f291d2',
      email: 'admin11mlg@jurnal.com',
      full_name: 'Admin SMKN 11 Malang',
      email_verified: true,
      phone_verified: false
    },
    created_at: '2026-08-10 04:04:36.312741+00',
    updated_at: '2026-08-10 08:50:00.137921+00',
    role: 'authenticated',
    aud: 'authenticated'
  },
  {
    id: 'ff8b3ac4-b698-4249-8cd4-a13463038f58',
    email: 'hydrogz7@gmail.com',
    encrypted_password: '$2a$10$z9vjQcVQ7ttrobEePs4Kbe9cLqmr2FcaQLonPkVvNfMLZItUq0g9u',
    email_confirmed_at: '2026-08-03 04:40:22.330883+00',
    raw_app_meta_data: { provider: 'email', providers: ['email', 'google'] },
    raw_user_meta_data: {
      iss: 'https://accounts.google.com',
      sub: '108296777951059325661',
      name: 'Ordi Kurniawan',
      email: 'hydrogz7@gmail.com',
      picture: 'https://lh3.googleusercontent.com/a/ACg8ocKpAf549jDZzjpZHdS1P1fMu86alQCzBWN-PbISW3Hz9kKerjPr=s96-c',
      full_name: 'Ordi Kurniawan',
      avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocKpAf549jDZzjpZHdS1P1fMu86alQCzBWN-PbISW3Hz9kKerjPr=s96-c',
      provider_id: '108296777951059325661',
      email_verified: true,
      phone_verified: false
    },
    created_at: '2026-08-03 04:40:22.251692+00',
    updated_at: '2026-08-10 07:19:43.492981+00',
    role: 'authenticated',
    aud: 'authenticated'
  },
  {
    id: '8306a23a-b412-447e-b964-d49f94903daf',
    email: 'veysnx@gmail.com',
    encrypted_password: null,
    email_confirmed_at: '2026-08-04 06:31:37.722106+00',
    raw_app_meta_data: { provider: 'google', providers: ['google'] },
    raw_user_meta_data: {
      iss: 'https://accounts.google.com',
      sub: '117101183578027422665',
      name: 'Veysania Crimsonn',
      email: 'veysnx@gmail.com',
      picture: 'https://lh3.googleusercontent.com/a/ACg8ocKM4UBxk05Q2DoFuI-T24rBST_PTQVWNr3emnKhQB0unvY3jA=s96-c',
      full_name: 'Veysania Crimsonn',
      avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocKM4UBxk05Q2DoFuI-T24rBST_PTQVWNr3emnKhQB0unvY3jA=s96-c',
      provider_id: '117101183578027422665',
      email_verified: true,
      phone_verified: false
    },
    created_at: '2026-08-04 06:31:37.71113+00',
    updated_at: '2026-08-04 06:31:39.068105+00',
    role: 'authenticated',
    aud: 'authenticated'
  }
];

async function runProfilesAndMemberships() {
  console.log("=== MIGRATING PROFILES AND MEMBERSHIPS ===");

  // 1. Fetch profiles
  const { data: profiles } = await sourceSupabase.from("profiles").select("*");
  if (profiles && profiles.length > 0) {
    console.log(`📦 Fetched ${profiles.length} profiles from source.`);
    for (const p of profiles) {
      const { error } = await destSupabase.from("profiles").upsert(p, { onConflict: "id" });
      if (error) console.error(`❌ Profile ${p.id} error:`, error.message);
      else console.log(`✅ Profile ${p.full_name || p.id} migrated!`);
    }
  }

  // 2. Fetch memberships
  const { data: memberships } = await sourceSupabase.from("memberships").select("*");
  if (memberships && memberships.length > 0) {
    console.log(`📦 Fetched ${memberships.length} memberships from source.`);
    for (const m of memberships) {
      const { error } = await destSupabase.from("memberships").upsert(m, { onConflict: "id" });
      if (error) console.error(`❌ Membership ${m.id} error:`, error.message);
      else console.log(`✅ Membership ${m.id} migrated!`);
    }
  }
}

runProfilesAndMemberships();
