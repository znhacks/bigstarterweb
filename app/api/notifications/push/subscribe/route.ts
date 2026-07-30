// app/api/notifications/push/subscribe/route.ts
//
// Endpoint pendaftaran/penghapusan Web Push subscription per user.
// Memakai RLS server client (createClient) sehingga policy push_subscriptions
// (CRUD milik sendiri) men-validasi user_id = auth.uid().

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { pushSubscriptionRepository } from "@/supabase/repositories/push-subscriptions";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  const repo = await pushSubscriptionRepository(supabase);
  const { error } = await repo.upsert({
    user_id: user.id,
    endpoint: body.endpoint,
    keys: body.keys,
    user_agent: body.userAgent ?? null
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
