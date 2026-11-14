// Judge demo mode (PLAN.md R18): POST /api/demo/<step> runs one story step on
// testnet, signed by the server with the demo accounts. GET /api/demo/state
// reads the demo deals and the parties' fEUR balances. Keys never reach the browser.
import { NextResponse } from "next/server";
import { DemoNotConfiguredError, balances, getDeal, PARTIES, runAction, type DemoAction } from "@/lib/demo-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ACTIONS: DemoAction[] = ["create", "approve", "deposit", "pay", "topup", "rogue", "release", "resale"];

// Small per-client budget: each step costs testnet gas from the demo accounts.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 80;
const hits = new Map<string, { start: number; count: number }>();
function overBudget(client: string) {
  const now = Date.now();
  const entry = hits.get(client);
  if (!entry || now - entry.start > WINDOW_MS) { hits.set(client, { start: now, count: 1 }); return false; }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function fail(error: unknown) {
  if (error instanceof DemoNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
  const message = error instanceof Error ? error.message.split("\n")[0].slice(0, 300) : "The demo step failed.";
  console.error("[demo]", message);
  return NextResponse.json({ error: message }, { status: 422 });
}

const parseId = (value: unknown) => (value === undefined || value === null || value === "" ? undefined : Number(value));

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ACTIONS.includes(action as DemoAction)) return NextResponse.json({ error: "Unknown demo step." }, { status: 404 });
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (overBudget(client)) return NextResponse.json({ error: "Too many demo steps. Please wait a few minutes." }, { status: 429 });
  try {
    const body = (await request.json().catch(() => ({}))) as { dealId?: unknown };
    return NextResponse.json(await runAction(action as DemoAction, parseId(body.dealId)));
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "state") return NextResponse.json({ error: "Use POST for demo steps." }, { status: 405 });
  try {
    const url = new URL(request.url);
    const dealId = parseId(url.searchParams.get("dealId"));
    const resaleId = parseId(url.searchParams.get("resaleId"));
    const [deal, resale, bal] = await Promise.all([
      dealId === undefined ? null : getDeal(dealId),
      resaleId === undefined ? null : getDeal(resaleId),
      balances(),
    ]);
    return NextResponse.json({ deal, resale, balances: bal, parties: PARTIES(), now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
