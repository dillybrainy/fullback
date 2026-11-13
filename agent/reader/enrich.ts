/**
 * enrich.ts — turns the raw model answer into the final `ReaderOutput`.
 *
 * Everything here is computed by code, never by the model (KTD5, R14):
 *   - `sellOn.bps`            from `sellOn.percent` (× 100)
 *   - `trainingClubs[].bps`   from the age range (`training.ts`)
 *   - `trainingClubs[].account` mapped from the club name (`clubs.json`)
 *   - `warnings[]`            quote checks + cross-field checks
 *
 * Training clubs whose computed bps is 0 (e.g. a club that only trained the
 * player from age 24) are dropped: the contract rejects training clubs with no
 * royalty and clubs that are also the seller/buyer.
 */
import {
  percentToBps,
  ReaderOutputSchema,
  type ReaderLLM,
  type ReaderOutput,
  type Warning,
} from "../schema.js";
import { trainingBps } from "../training.js";
import { collectQuotes, findUnmatchedQuotes, normalizeWs } from "./quotes.js";

export interface EnrichOptions {
  /** Club name → NEAR testnet account id (from `clubs.json`). */
  clubs: Record<string, string>;
}

export function enrichReaderOutput(
  llm: ReaderLLM,
  pdfText: string,
  opts: EnrichOptions,
): ReaderOutput {
  const warnings: Warning[] = [];
  const pdfNormalized = normalizeWs(pdfText);

  // R14: every quote must appear verbatim in the PDF text.
  for (const check of findUnmatchedQuotes(pdfNormalized, collectQuotes(llm))) {
    warnings.push({
      code: "quote_not_found",
      field: check.field,
      message: `The quote for ${check.field} (clause ${check.clause}) was not found verbatim in the PDF text.`,
    });
  }

  // Sell-on: percentage → bps; net basis is unsupported.
  const sellOnBps = percentToBps(llm.sellOn.percent);
  if (llm.sellOn.basis === "net") {
    warnings.push({
      code: "sell_on_net",
      field: "sellOn",
      message: "A sell-on on a net basis is not supported; FULLBACK only handles gross sell-ons.",
    });
  }

  // Training clubs: compute bps from the age history, map accounts, drop 0 bps.
  const trainingClubs = [];
  for (const club of llm.trainingClubs) {
    const bps = trainingBps(club.ageFrom, club.ageTo);
    if (bps === 0) continue;
    const account = opts.clubs[club.name];
    if (!account) {
      throw new Error(
        `Unknown training club "${club.name}". Add its testnet account to agent/clubs.json.`,
      );
    }
    trainingClubs.push({ ...club, account, bps });
  }

  // The installments must add up to the fee.
  const installmentsSum = llm.installments.reduce((sum, i) => sum + i.amount, 0);
  if (installmentsSum !== llm.fee.amount) {
    warnings.push({
      code: "installments_mismatch",
      field: "installments",
      message: `The installments sum to ${installmentsSum} but the fee is ${llm.fee.amount}.`,
    });
  }

  return ReaderOutputSchema.parse({
    player: llm.player,
    fee: llm.fee,
    installments: llm.installments,
    collateral: llm.collateral,
    sellOn: {
      quote: llm.sellOn.quote,
      clause: llm.sellOn.clause,
      bps: sellOnBps,
      basis: llm.sellOn.basis,
    },
    trainingClubs,
    warnings,
  });
}
