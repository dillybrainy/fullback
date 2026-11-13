import { describe, expect, it } from "vitest";
import type { ReaderLLM } from "../schema.js";
import { enrichReaderOutput } from "../reader/enrich.js";
import { collectQuotes, findUnmatchedQuotes, normalizeWs } from "../reader/quotes.js";
import { DEMO_FIXTURES_BY_HASH, readPdf } from "../reader/index.js";

// A faithful Deal 1 LLM answer (before code fills bps/accounts), from the real
// PDF text of sample-agreements/deal1-nordvik-portoalegre.pdf.
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

  it("rejects an unknown PDF in demo mode with a helpful message", async () => {
    process.env.DEMO_MODE = "true";
    await expect(readPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow(/not one of the demo agreements/);
  });
});
