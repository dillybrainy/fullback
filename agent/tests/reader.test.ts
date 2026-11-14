import { describe, expect, it } from "vitest";
import type { ReaderLLM } from "../schema.js";
import { enrichReaderOutput } from "../reader/enrich.js";
import {
  collectQuotes,
  containsAmount,
  containsDate,
  containsPercent,
  findUnmatchedQuotes,
  findUnsupportedValues,
  isPartyName,
  normalizeWs,
} from "../reader/quotes.js";
import { DEMO_FIXTURES_BY_HASH, readPdf } from "../reader/index.js";

// A faithful Deal 1 LLM answer (before code fills bps/accounts), from the real
// PDF text of deal1-nordvik-portoalegre.pdf (demo PDF, now only in git
// history at commit f741c98 — kept inline so this test reads no files).
const DEAL1_PDF_TEXT = normalizeWs(`
PERMANENT TRANSFER AGREEMENT Agreement No. FB-DEMO-001 Signed on 1 April 2027
1. Parties 1.1 Nordvik IF (the "Seller"). 1.2 Porto Alegre FC (the "Buyer").
1.3 The professional football player Lucas Andrade, born on 14 March 2001 (the "Player").
3. Transfer fee 3.1 The Buyer shall pay the Seller a fixed transfer fee of EUR 10,000,000 (ten million euros).
3.2 The transfer fee shall be paid in four (4) equal installments of EUR 2,500,000 (two million five hundred thousand euros) each, due on 30 April 2027, 31 July 2027, 31 October 2027 and 31 January 2028.
4. Security 4.1 the Buyer shall deposit security of EUR 2,500,000 (two million five hundred thousand euros), equal to one installment.
5. Sell-on 5.1 the Buyer shall pay the Seller fifteen percent (15%) of the gross transfer fee received.
6.2 A solidarity contribution of up to five percent (5%).
Annex A Registration history: Akademi Desa 12 to 15 2013 to 2016; Kota FC 16 to 23 2017 to 2024; Nordvik IF 24 onwards 2025 to 2027.
`);

const DEAL1_LLM: ReaderLLM = {
  player: {
    name: "Lucas Andrade",
    birthDate: "2001-03-14",
    quote: "Lucas Andrade, born on 14 March 2001",
    clause: "1.3",
  },
  fee: {
    amount: 10000000,
    currency: "EUR",
    quote: "a fixed transfer fee of EUR 10,000,000",
    clause: "3.1",
  },
  installments: [
    { index: 0, amount: 2500000, dueDate: "2027-04-30", quote: "four (4) equal installments of EUR 2,500,000", clause: "3.2" },
    { index: 1, amount: 2500000, dueDate: "2027-07-31", quote: "four (4) equal installments of EUR 2,500,000", clause: "3.2" },
    { index: 2, amount: 2500000, dueDate: "2027-10-31", quote: "four (4) equal installments of EUR 2,500,000", clause: "3.2" },
    { index: 3, amount: 2500000, dueDate: "2028-01-31", quote: "four (4) equal installments of EUR 2,500,000", clause: "3.2" },
  ],
  collateral: {
    amount: 2500000,
    quote: "security of EUR 2,500,000",
    clause: "4.1",
  },
  sellOn: {
    percent: 15,
    basis: "gross",
    quote: "fifteen percent (15%) of the gross transfer fee",
    clause: "5.1",
  },
  trainingClubs: [
    { name: "Akademi Desa", ageFrom: 12, ageTo: 15, quote: "12 to 15", clause: "Annex A" },
    { name: "Kota FC", ageFrom: 16, ageTo: 23, quote: "16 to 23", clause: "Annex A" },
    { name: "Nordvik IF", ageFrom: 24, ageTo: 26, quote: "24 onwards", clause: "Annex A" },
  ],
};

const CLUBS: Record<string, string> = {
  "Akademi Desa": "akademidesa.<master>.testnet",
  "Kota FC": "kotafc.<master>.testnet",
  "Nordvik IF": "nordvik.<master>.testnet",
};

describe("quote checking (R14)", () => {
  it("finds all quotes of a faithful answer", () => {
    const checks = collectQuotes(DEAL1_LLM);
    expect(checks.map((c) => c.field)).toEqual([
      "player",
      "fee",
      "installments[0]",
      "installments[1]",
      "installments[2]",
      "installments[3]",
      "collateral",
      "sellOn",
      "trainingClubs[0]",
      "trainingClubs[1]",
      "trainingClubs[2]",
    ]);
    expect(findUnmatchedQuotes(normalizeWs(DEAL1_PDF_TEXT), checks)).toEqual([]);
  });

  it("flags a quote the model invented", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.fee.quote = "a transfer fee of EUR 9,999,999 (made up)";
    const out = enrichReaderOutput(llm, DEAL1_PDF_TEXT, { clubs: CLUBS });
    expect(out.warnings).toContainEqual(
      expect.objectContaining({ code: "quote_not_found", field: "fee" }),
    );
  });

  it("normalises whitespace before matching", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.player.quote = "Lucas Andrade, born on  14  March\n2001";
    expect(findUnmatchedQuotes(normalizeWs(DEAL1_PDF_TEXT), collectQuotes(llm))).toEqual([]);
  });
});

describe("enrichReaderOutput", () => {
  it("Deal 1: computes bps, maps accounts, drops 0-bps clubs, no warnings", () => {
    const out = enrichReaderOutput(DEAL1_LLM, DEAL1_PDF_TEXT, { clubs: CLUBS });
    expect(out.sellOn).toMatchObject({ bps: 1500, basis: "gross" });
    expect(out.trainingClubs).toEqual([
      {
        name: "Akademi Desa",
        account: "akademidesa.<master>.testnet",
        ageFrom: 12,
        ageTo: 15,
        bps: 100,
        quote: "12 to 15",
        clause: "Annex A",
      },
      {
        name: "Kota FC",
        account: "kotafc.<master>.testnet",
        ageFrom: 16,
        ageTo: 23,
        bps: 400,
        quote: "16 to 23",
        clause: "Annex A",
      },
    ]);
    expect(out.warnings).toEqual([]);
  });

  it("flags a net sell-on basis as unsupported", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.sellOn.basis = "net";
    const out = enrichReaderOutput(llm, DEAL1_PDF_TEXT, { clubs: CLUBS });
    expect(out.warnings).toContainEqual(
      expect.objectContaining({ code: "sell_on_net", field: "sellOn" }),
    );
  });

  it("flags installments that do not add up to the fee", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.installments[3].amount = 2000000;
    const out = enrichReaderOutput(llm, DEAL1_PDF_TEXT, { clubs: CLUBS });
    expect(out.warnings).toContainEqual(
      expect.objectContaining({ code: "installments_mismatch", field: "installments" }),
    );
  });

  it("throws when a training club is missing from clubs.json", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.trainingClubs[0].name = "Unknown Academy";
    expect(() => enrichReaderOutput(llm, DEAL1_PDF_TEXT, { clubs: CLUBS })).toThrow(
      /Unknown Academy/,
    );
  });
});

describe("DEMO_MODE (fixtures, no API key)", () => {
  it("maps the committed demo PDF hashes to their fixtures", () => {
    const deal1 = DEMO_FIXTURES_BY_HASH["eab475572d0bf6ce627ac7b0160e5a34ef3c2ebc49cbdd8c75b76aa54d0d1832"];
    const deal2 = DEMO_FIXTURES_BY_HASH["2d72a5235790ff650eedec20de6c1e61b6efb25fa1b38852da295a4abe60737e"];
    expect(deal1.fee.amount).toBe(10000000);
    expect(deal2.fee.amount).toBe(20000000);
    expect(deal2.collateral).toBeUndefined();
  });

  it("also maps the neutral test PDFs OK-01 and OK-02", () => {
    const ok01 = DEMO_FIXTURES_BY_HASH["1340d083678a312547b454050f3d4d5246f34deacc641c428ee36bb2c1d3bf88"];
    const ok02 = DEMO_FIXTURES_BY_HASH["dc12f270a006a194ffa00e7dcc955b93ed3c9c3abb5c1a5944af1ee3d5bb816f"];
    expect(ok01.fee.amount).toBe(6000000);
    expect(ok02.fee.amount).toBe(10000000);
    expect(ok02.collateral?.amount).toBe(3000000);
  });

  it("rejects an unknown PDF in demo mode with a helpful message", async () => {
    process.env.DEMO_MODE = "true";
    await expect(readPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow(/not one of the demo agreements/);
  });
});

describe("value checks (the value must be written, not only the quote)", () => {
  it("accepts the faithful Deal 1 answer", () => {
    expect(findUnsupportedValues(DEAL1_PDF_TEXT, DEAL1_LLM)).toEqual([]);
  });

  it("flags an invented birth date behind a real quote", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.player.birthDate = "2000-01-01";
    const out = enrichReaderOutput(llm, DEAL1_PDF_TEXT, { clubs: CLUBS });
    expect(out.warnings).toContainEqual(
      expect.objectContaining({ code: "quote_not_found", field: "player.birthDate" }),
    );
  });

  it("flags an amount or percentage that is not in its quote", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.fee.amount = 9000000;
    llm.sellOn.percent = 10;
    const fields = findUnsupportedValues(DEAL1_PDF_TEXT, llm).map((c) => c.field);
    expect(fields).toEqual(expect.arrayContaining(["fee", "sellOn"]));
  });

  it("flags a due date the PDF never states", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.installments[2].dueDate = "2027-11-30";
    const fields = findUnsupportedValues(DEAL1_PDF_TEXT, llm).map((c) => c.field);
    expect(fields).toEqual(["installments[2].dueDate"]);
  });

  it("reads amounts and dates in common written forms", () => {
    expect(containsAmount("EUR 2.500.000", 2500000)).toBe(true);
    expect(containsAmount("EUR 25,000,000", 2500000)).toBe(false);
    expect(containsDate("born on August 9, 2004", "2004-08-09")).toBe(true);
    expect(containsDate("due on 9th of August 2004", "2004-08-09")).toBe(true);
    expect(containsDate("due on 19 August 2004", "2004-08-09")).toBe(false);
    expect(containsPercent("ten percent (10%)", 10)).toBe(true);
    expect(containsPercent("twelve and a half percent (12.5%)", 5)).toBe(false);
  });
});

describe("Seller and Buyer are not training clubs", () => {
  const text = normalizeWs(
    `1.1 Harbour City FC, a football club (the "Seller"). 1.2 Lakeside Athletic (the "Buyer"). ` +
      `Annex A Akademi Desa 12 to 15; Kota FC 16 to 20; Harbour City FC 21 onwards`,
  );

  it("recognises the parties by their definition", () => {
    expect(isPartyName(text, "Harbour City FC")).toBe(true);
    expect(isPartyName(text, "Lakeside Athletic")).toBe(true);
    expect(isPartyName(text, "Kota FC")).toBe(false);
  });

  it("drops the seller's Annex A row instead of failing on an unknown club", () => {
    const llm = structuredClone(DEAL1_LLM);
    llm.trainingClubs[2] = { name: "Harbour City FC", ageFrom: 21, ageTo: 22, quote: "21 onwards", clause: "Annex A" };
    const out = enrichReaderOutput(llm, `${DEAL1_PDF_TEXT} ${text}`, { clubs: CLUBS });
    expect(out.trainingClubs.map((c) => c.name)).toEqual(["Akademi Desa", "Kota FC"]);
  });
});
