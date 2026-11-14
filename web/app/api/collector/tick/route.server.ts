// POST /api/collector/tick (PLAN.md KTD7): the deal page calls this every 15 s.
// The collector agent signs settle_due with its restricted key (it can call
// nothing else) once the next installment is due.
import { NextResponse } from "next/server";
import { DemoNotConfiguredError, collectorTick } from "@/lib/demo-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  try {
    const body = (await request.json().catch(() => ({}))) as { dealId?: unknown };
    const dealId = Number(body.dealId);
    if (!Number.isSafeInteger(dealId) || dealId < 0) return NextResponse.json({ error: "Missing deal." }, { status: 400 });
    return NextResponse.json(await collectorTick(dealId));
  } catch (error) {
    if (error instanceof DemoNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    const message = error instanceof Error ? error.message.split("\n")[0].slice(0, 300) : "Collector tick failed.";
    console.error("[collector]", message);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
