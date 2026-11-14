import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  eurToSmallestUnit,
  percentToBps,
  ReaderLLMSchema,
  ReaderOutputSchema,
} from "../schema.js";

const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(FIXTURES, name), "utf8"));
}

describe("helpers", () => {
  it("eurToSmallestUnit multiplies by 10^6 exactly", () => {
    expect(eurToSmallestUnit(2500000)).toBe("2500000000000"); // 2.500.000 fEUR
    expect(eurToSmallestUnit(10000000)).toBe("10000000000000"); // 10.000.000 fEUR
    expect(eurToSmallestUnit(0)).toBe("0");
  });

  it("eurToSmallestUnit rejects non-integers", () => {
    expect(() => eurToSmallestUnit(1.5)).toThrow();
    expect(() => eurToSmallestUnit(-1)).toThrow();
  });

  it("percentToBps multiplies by 100", () => {
    expect(percentToBps(15)).toBe(1500); // 15% = 1500 bps
    expect(percentToBps(0)).toBe(0);
    expect(percentToBps(100)).toBe(10000);
  });

  it("percentToBps rejects values outside 0..100", () => {
    expect(() => percentToBps(-1)).toThrow();
    expect(() => percentToBps(101)).toThrow();
  });
});

describe("fixtures", () => {
  it("deal1 passes ReaderOutputSchema and matches R2", () => {
    const deal = ReaderOutputSchema.parse(fixture("deal1.json"));
    expect(deal.fee.amount).toBe(10000000);
    expect(deal.installments).toHaveLength(4);
    expect(deal.installments.map((i) => i.amount)).toEqual([2500000, 2500000, 2500000, 2500000]);
    expect(deal.collateral?.amount).toBe(2500000);
    expect(deal.sellOn).toMatchObject({ bps: 1500, basis: "gross" });
    const byName = Object.fromEntries(deal.trainingClubs.map((c) => [c.name, c.bps]));
    expect(byName).toEqual({ "Kota FC": 400, "Akademi Desa": 100 });
    expect(deal.warnings).toEqual([]);
  });

  it("deal1 passes ReaderLLMSchema when bps/account are stripped", () => {
    const { trainingClubs, ...rest } = ReaderOutputSchema.parse(fixture("deal1.json"));
    const llmShape = {
      ...rest,
      sellOn: { quote: rest.sellOn.quote, clause: rest.sellOn.clause, percent: 15, basis: "gross" },
      trainingClubs: trainingClubs.map(({ bps, account, ...c }) => c),
    };
    expect(() => ReaderLLMSchema.parse(llmShape)).not.toThrow();
  });

  it("deal2 (resale) passes ReaderOutputSchema without collateral and matches R4", () => {
    const deal = ReaderOutputSchema.parse(fixture("deal2.json"));
    expect(deal.fee.amount).toBe(20000000);
    expect(deal.installments).toHaveLength(1);
    expect(deal.installments[0].amount).toBe(20000000);
    expect(deal.collateral).toBeUndefined();
    expect(deal.sellOn).toMatchObject({ bps: 1500, basis: "gross" });
  });
});

describe("test-suite fixtures ({ pdfHash, output })", () => {
  const load = (name: string) =>
    JSON.parse(readFileSync(resolve(FIXTURES, name), "utf8")) as { pdfHash: string; output: unknown };

  it("ok01 (tests/OK-01-basic.pdf) passes ReaderOutputSchema and matches the PDF", () => {
    const file = load("ok01-basic.json");
    expect(file.pdfHash).toBe("1340d083678a312547b454050f3d4d5246f34deacc641c428ee36bb2c1d3bf88");
    const deal = ReaderOutputSchema.parse(file.output);
    expect(deal.fee.amount).toBe(6000000);
    expect(deal.installments.map((i) => i.amount)).toEqual([2000000, 2000000, 2000000]);
    expect(deal.collateral?.amount).toBe(2000000);
    expect(deal.sellOn).toMatchObject({ bps: 1000, basis: "gross" });
    const byName = Object.fromEntries(deal.trainingClubs.map((c) => [c.name, c.bps]));
    expect(byName).toEqual({ "Akademi Desa": 100, "Kota FC": 250 });
    expect(deal.warnings).toEqual([]);
  });

  it("ok02 (tests/OK-02-unequal-installments.pdf) passes ReaderOutputSchema with unequal installments", () => {
    const file = load("ok02-unequal-installments.json");
    expect(file.pdfHash).toBe("dc12f270a006a194ffa00e7dcc955b93ed3c9c3abb5c1a5944af1ee3d5bb816f");
    const deal = ReaderOutputSchema.parse(file.output);
    expect(deal.fee.amount).toBe(10000000);
    expect(deal.installments.map((i) => i.amount)).toEqual([4000000, 3000000, 3000000]);
    expect(deal.collateral?.amount).toBe(3000000);
    expect(deal.warnings).toEqual([]);
  });

  it("the pdfHash keys equal tests/manifest.json (committed LF bytes)", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(FIXTURES, "..", "..", "sample-agreements", "tests", "manifest.json"), "utf8"),
    ) as { file: string; sha256: string }[];
    const sha = Object.fromEntries(manifest.map((m) => [m.file, m.sha256]));
    expect(load("ok01-basic.json").pdfHash).toBe(sha["OK-01-basic.pdf"]);
    expect(load("ok02-unequal-installments.json").pdfHash).toBe(sha["OK-02-unequal-installments.pdf"]);
  });
});
