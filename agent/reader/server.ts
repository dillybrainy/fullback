import { createServer } from "node:http";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createReaderHandler, MAX_READER_BYTES } from "./http.js";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });
const handle = createReaderHandler();
const port = Number(process.env.READER_PORT ?? 3001);
const host = process.env.READER_HOST ?? "127.0.0.1";
const server = createServer(async (incoming, outgoing) => {
  let size = 0;
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > MAX_READER_BYTES) {
        outgoing.writeHead(413, { "Content-Type": "application/json", Connection: "close" });
        outgoing.end(JSON.stringify({ error: "This PDF is larger than 20 MB." }));
        return;
      }
      chunks.push(Buffer.from(chunk));
    }
    const controller = new AbortController();
    outgoing.on("close", () => { if (!outgoing.writableEnded) controller.abort(); });
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(",") : value);
    const request = new Request("http://reader.local" + incoming.url, {
      method: incoming.method, headers, signal: controller.signal,
      body: ["GET", "HEAD", "OPTIONS"].includes(incoming.method ?? "GET") ? undefined : Buffer.concat(chunks),
    });
    const response = await handle(request, incoming.socket.remoteAddress ?? "unknown");
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(400, { "Content-Type": "application/json" });
    outgoing.end(JSON.stringify({ error: "Unable to read this PDF request." }));
  }
});
server.requestTimeout = 80000;
server.listen(port, host, () => console.log(`FULLBACK AI Reader listening on http://${host}:${port}/api/reader`));
