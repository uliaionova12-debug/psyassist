import { NextResponse } from "next/server";

import { runGeminiTransportHealthCheck } from "@/lib/ai/gemini-clinical";

export const runtime = "nodejs";

/** Minimal Gemini transport probe (no UI). Model must answer with OK to pass. */
export async function GET() {
  const r = await runGeminiTransportHealthCheck();
  if (!r.ok) {
    return NextResponse.json({ ok: false as const, detail: r.detail ?? "failed" }, { status: 503 });
  }
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
