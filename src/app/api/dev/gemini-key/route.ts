import { NextResponse } from "next/server";

import { getGeminiRuntimeApiKey, setGeminiRuntimeApiKey } from "@/lib/ai/gemini-runtime-key";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") return notFound();
  const key = getGeminiRuntimeApiKey();
  return NextResponse.json({ configured: Boolean(key?.trim()) });
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return notFound();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("key" in body)) {
    return NextResponse.json({ error: "Expected { key: string }" }, { status: 400 });
  }
  const raw = (body as { key: unknown }).key;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "key must be a string" }, { status: 400 });
  }
  const key = raw.trim();
  if (!key) {
    return NextResponse.json({ error: "key must not be empty" }, { status: 400 });
  }
  setGeminiRuntimeApiKey(key);
  return NextResponse.json({ ok: true as const });
}

export async function DELETE() {
  if (process.env.NODE_ENV !== "development") return notFound();
  setGeminiRuntimeApiKey(null);
  return NextResponse.json({ ok: true as const });
}
