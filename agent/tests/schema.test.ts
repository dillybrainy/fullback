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
  // Fixture format: { pdfHash, output } — see agent/fixtures/README.md.
  const file = JSON.parse(readFileSync(resolve(FIXTURES, name), "utf8")) as {
    pdfHash: string;
    output: unknown;
  };
  return file.output;
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
  it("deal1 (tests/OK-01-basic.pdf) passes ReaderOutputSchema and matches the PDF", () => {
    const deal = ReaderOutputSchema.parse(fixture("deal1.json"));
    expect(deal.fee.amount).toBe(6000000);
    expect(deal.installments).toHaveLength(3);
    expect(deal.installments.map((i) => i.amount)).toEqual([2000000, 2000000, 2000000]);
    expect(deal.collateral?.amount).toBe(2000000);
    expect(deal.sellOn).toMatchObject({ bps: 1000, basis: "gross" });
    const byName = Object.fromEntries(deal.trainingClubs.map((c) => [c.name, c.bps]));
    expect(byName).toEqual({ "Akademi Desa": 100, "Kota FC": 250 });
    expect(deal.warnings).toEqual([]);
  });

  it("deal1 passes ReaderLLMSchema when bps/account are stripped", () => {
    const { trainingClubs, ...rest } = ReaderOutputSchema.parse(fixture("deal1.json"));
    const llmShape = {
      ...rest,
      sellOn: { quote: rest.sellOn.quote, clause: rest.sellOn.clause, percent: 10, basis: "gross" },
      trainingClubs: trainingClubs.map(({ bps, account, ...c }) => c),
    };
    expect(() => ReaderLLMSchema.parse(llmShape)).not.toThrow();
  });

  it("deal2 (tests/OK-02-unequal-installments.pdf) passes ReaderOutputSchema with unequal installments", () => {
    const deal = ReaderOutputSchema.parse(fixture("deal2.json"));
    expect(deal.fee.amount).toBe(10000000);
    expect(deal.installments.map((i) => i.amount)).toEqual([4000000, 3000000, 3000000]);
    expect(deal.collateral?.amount).toBe(3000000);
    expect(deal.sellOn).toMatchObject({ bps: 1000, basis: "gross" });
    expect(deal.warnings).toEqual([]);
  });

  it("collateral is optional (a resale deal has none)", () => {
    const { collateral: _collateral, ...withoutCollateral } = ReaderOutputSchema.parse(
      fixture("deal2.json"),
    );
    expect(() => ReaderOutputSchema.parse(withoutCollateral)).not.toThrow();
  });
});
