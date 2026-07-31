// app/api/jobs/run/[jobId]/route.ts
//
// Execution entrypoint untuk provider Vercel: menjalankan job via registry.
// Dipanggil oleh lib/jobs/providers/vercel.ts (enqueue). Dilindungi JOBS_SECRET.

import { NextRequest, NextResponse } from "next/server";
import "@/lib/jobs/handlers"; // side-effect: registrasi handler
import { runJob } from "@/lib/jobs/registry";
import { vercelJobsConfig } from "@/config/jobs";

function authorized(req: NextRequest) {
  const secret = vercelJobsConfig.secret;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> }
) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { jobId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await runJob(jobId, body?.payload);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> }
) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { jobId } = await ctx.params;
  try {
    const result = await runJob(jobId);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
