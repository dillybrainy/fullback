// POST /api/reader: the AI Reader (agent/reader) as a Next.js route, so the
// deployed site needs no separate reader server. PDF bytes go to NEAR AI Cloud
// (private TEE model, see agent/eval/README.md); no wallet keys are involved.
// Limits, origin check and error wording live in agent/reader/http.ts.
import { createReaderHandler } from "agent/dist/reader/http.js";

export const runtime = "nodejs"; // pdfjs and node:crypto do not run on the Edge runtime
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Same-origin requests are always allowed; READER_ALLOWED_ORIGINS adds others.
function allowedOrigins(request: Request): string[] {
  const extra = (process.env.READER_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return [new URL(request.url).origin, "http://localhost:3000", "http://127.0.0.1:3000", ...extra];
}

const handlers = new Map<string, ReturnType<typeof createReaderHandler>>();
function handlerFor(request: Request) {
  const origins = allowedOrigins(request);
  const key = origins.join(",");
  let handle = handlers.get(key);
  if (!handle) {
    handle = createReaderHandler({ origins });
    handlers.set(key, handle);
  }
  return handle;
}

function clientId(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

async function handle(request: Request) {
  return handlerFor(request)(request, clientId(request));
}

export { handle as GET, handle as POST, handle as OPTIONS };
