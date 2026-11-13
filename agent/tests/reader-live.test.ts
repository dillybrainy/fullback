/**
 * Live NEAR AI Cloud test — only runs when NEARAI_API_KEY is set (LIVE_TEST=1).
 *
 *   LIVE_TEST=1 npm test -w agent
 *
 * Uses the real sample PDF from sample-agreements/ (committed LF bytes read
 * from git, so the SHA-256 matches the documented fingerprint even on a
 * Windows CRLF checkout).
 */
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readPdf } from "../reader/index.js";

config({ path: resolve(process.cwd(), "..", ".env") });

const enabled = process.env.LIVE_TEST === "1" && !!process.env.NEARAI_API_KEY;

describe.runIf(enabled)("live NEAR AI Cloud reader (LIVE_TEST=1)", () => {
  it("reads deal1 PDF and returns the Deal 1 terms with no warnings", async () => {
    // Read the committed LF blob so the fingerprint matches the README table.
    const pdf = execFileSync("git", [
      "cat-file",
      "blob",
      "HEAD:sample-agreements/deal1-nordvik-portoalegre.pdf",
    ]);

    process.env.DEMO_MODE = "false";
    const { output, pdfHash } = await readPdf(new Uint8Array(pdf));

    expect(pdfHash).toBe("eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832");
    expect(output.fee.amount).toBe(10000000);
    expect(output.collateral?.amount).toBe(2500000);
    expect(output.sellOn.bps).toBe(1500);
    expect(output.sellOn.basis).toBe("gross");
    expect(output.installments).toHaveLength(4);
    expect(output.installments.every((i) => i.amount === 2500000)).toBe(true);

    const byName = Object.fromEntries(output.trainingClubs.map((c) => [c.name, c.bps]));
    expect(byName).toEqual({ "Kota FC": 400, "Akademi Desa": 100 });

    // R14: every quote must appear verbatim in the PDF text.
    expect(output.warnings).toEqual([]);
  }, 90_000);
});
