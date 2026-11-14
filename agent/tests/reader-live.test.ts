/**
 * Live NEAR AI Cloud test — only runs when LIVE_TEST=1 and an API key are set.
 *
 *   $env:LIVE_TEST='1'; npm test -w agent -- tests/reader-live.test.ts
 *
 * Reads the demo PDF sample-agreements/tests/OK-01-basic.pdf (the deal1
 * fixture source) through the REAL LLM pipeline and checks that the extracted
 * terms match agent/fixtures/deal1.json — every number backed by a verbatim
 * quote (R14, warnings must be empty).
 */
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readPdf } from "../reader/index.js";

config({ path: resolve(process.cwd(), "..", ".env") });

const enabled = process.env.LIVE_TEST === "1" && !!process.env.NEARAI_API_KEY;

describe.runIf(enabled)("live NEAR AI Cloud reader (LIVE_TEST=1)", () => {
  it("reads OK-01-basic.pdf and returns the deal1 terms with no warnings", async () => {
    // Committed LF blob so the fingerprint matches the fixture key on every
    // checkout (Windows CRLF would change the hash).
    const pdf = execFileSync("git", [
      "cat-file",
      "blob",
      "HEAD:sample-agreements/tests/OK-01-basic.pdf",
    ]);

    process.env.DEMO_MODE = "false";
    const { output, pdfHash } = await readPdf(new Uint8Array(pdf));

    expect(pdfHash).toBe("1340d083678a312547b454050f3d4d5246f34deacc641c428ee36bb2c1d3bf88");
    expect(output.player.name).toBe("Daniel Okoro");
    expect(output.player.birthDate).toBe("2004-08-09");
    expect(output.fee.amount).toBe(6000000);
    expect(output.collateral?.amount).toBe(2000000);
    expect(output.sellOn.bps).toBe(1000);
    expect(output.sellOn.basis).toBe("gross");
    expect(output.installments).toHaveLength(3);
    expect(output.installments.every((i) => i.amount === 2000000)).toBe(true);

    const byName = Object.fromEntries(output.trainingClubs.map((c) => [c.name, c.bps]));
    expect(byName).toEqual({ "Akademi Desa": 100, "Kota FC": 250 });

    // R14: every quote must appear verbatim in the PDF text.
    expect(output.warnings).toEqual([]);
  }, 150_000);
});
