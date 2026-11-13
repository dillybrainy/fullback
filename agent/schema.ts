import { z } from "zod";

/**
 * agent/schema.ts — FULLBACK AI Reader schema (owner: Orang 2).
 *
 * FROZEN Wednesday 11 Nov 2026 night. Any change after that must be announced
 * to the group and approved by all four people (see PLAN.md, "Interfaces yang
 * dikunci Rabu 11 Nov").
 *
 * This file is the single source of truth for the shape of the JSON the AI
 * Reader produces, and that `web/` and `scripts/` consume.
 *
 * Two schemas live here:
 *
 *  1. `ReaderLLMSchema` — the exact JSON the AI Reader (NEAR AI Cloud) must
 *     return. It contains only what the model can read from the PDF.
 *
 *  2. `ReaderOutputSchema` — the final, validated output after code fills in
 *     the fields the model must NOT invent (KTD5, R14):
 *       - `trainingClubs[].bps`     computed by `training.ts`
 *       - `trainingClubs[].account` mapped from the club name via `clubs.json`
 *       - `sellOn.bps`              converted from `sellOn.percent` (×100)
 *       - `warnings[]`              filled by the quote-checking code
 *
 * Money is expressed in whole fEUR units (1 fEUR = EUR 1), exactly as written
 * in the PDF, so the verbatim `quote` always matches the PDF text. Conversion
 * to the contract's smallest-unit U128 strings (6 decimals) is done with
 * `eurToSmallestUnit()` below — never by the model.
 */

/** fEUR decimals (NEP-141 `decimals = 6`). */
export const FEUR_DECIMALS = 6;

/** Convert a whole-fEUR amount to the contract's smallest-unit decimal string. */
export function eurToSmallestUnit(amountEur: number): string {
  if (!Number.isInteger(amountEur) || amountEur < 0) {
    throw new Error(`eurToSmallestUnit: expected a non-negative integer, got ${amountEur}`);
  }
  // BigInt keeps 10,000,000 × 1,000,000 exact and avoids float drift.
  return (BigInt(amountEur) * 10n ** BigInt(FEUR_DECIMALS)).toString();
}

/** Convert a percentage (e.g. 15) to basis points (1500). */
export function percentToBps(percent: number): number {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error(`percentToBps: expected an integer in 0..100, got ${percent}`);
  }
  return percent * 100;
}

// ---------------------------------------------------------------------------
// Base: a term that carries its verbatim quote and clause number
// ---------------------------------------------------------------------------

const Quoted = z.object({
  /** Verbatim text from the PDF (ASCII only, whitespace normalised). Checked to appear exactly in the PDF text (R14). */
  quote: z.string().min(1),
  /** Clause number, e.g. "3.1", or "Annex A" for the registration history. */
  clause: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Shared fields (identical in the LLM answer and the final output)
// ---------------------------------------------------------------------------

export const PlayerSchema = Quoted.extend({
  /** Player name as in the PDF, e.g. "Lucas Andrade". */
  name: z.string().min(1),
  /** ISO date, e.g. "2001-03-14". */
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate must be YYYY-MM-DD"),
});

export const FeeSchema = Quoted.extend({
  /** Whole fEUR units, e.g. 10000000. */
  amount: z.number().int().positive(),
  /** ISO 4217 code as in the PDF, normally "EUR". */
  currency: z.string().min(1),
});

export const InstallmentSchema = Quoted.extend({
  /** 0-based index, matching the contract's `installment_index`. */
  index: z.number().int().min(0),
  /** Whole fEUR units. */
  amount: z.number().int().positive(),
  /** ISO date, e.g. "2027-04-30". Display-only; the on-chain schedule uses compressed offsets (KTD4). */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD"),
});

export const CollateralSchema = Quoted.extend({
  /** Whole fEUR units. */
  amount: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// What the model returns (ReaderLLMSchema)
// ---------------------------------------------------------------------------

export const SellOnLLMSchema = Quoted.extend({
  /** The percentage exactly as written in the PDF, e.g. 15. Converted to bps by code. */
  percent: z.number().int().min(0).max(100),
  /** "gross" (supported) or "net" (unsupported → warning). */
  basis: z.enum(["gross", "net"]),
});

export const TrainingClubLLMSchema = Quoted.extend({
  /** Club name as in the PDF, e.g. "Kota FC". */
  name: z.string().min(1),
  /** First calendar age the player was registered at this club, e.g. 16. */
  ageFrom: z.number().int().min(0),
  /** Last calendar age the player was registered at this club, e.g. 23. */
  ageTo: z.number().int().min(0),
});

export const ReaderLLMSchema = z.object({
  player: PlayerSchema,
  fee: FeeSchema,
  installments: z.array(InstallmentSchema).min(1),
  /** Absent for resale agreements (they carry no security, e.g. Deal 2). */
  collateral: CollateralSchema.optional(),
  sellOn: SellOnLLMSchema,
  trainingClubs: z.array(TrainingClubLLMSchema),
});

export type ReaderLLM = z.infer<typeof ReaderLLMSchema>;

// ---------------------------------------------------------------------------
// Final output (after code fills the computed fields)
// ---------------------------------------------------------------------------

export const TrainingClubSchema = TrainingClubLLMSchema.extend({
  /** Testnet account id, mapped from `name` via `clubs.json`. */
  account: z.string().min(1),
  /** Solidarity bps, computed by `training.ts` (0.25%/yr age 12–15, 0.5%/yr age 16–23, max 500). */
  bps: z.number().int().min(0).max(500),
});

export const SellOnSchema = Quoted.extend({
  /** Basis points, converted from the percentage by code (`percentToBps`). */
  bps: z.number().int().min(0).max(10000),
  basis: z.enum(["gross", "net"]),
});

export const WarningSchema = z.object({
  code: z.enum(["quote_not_found", "sell_on_net", "installments_mismatch"]),
  /** Which field the warning is about, e.g. "fee", "installments[1]", "sellOn". */
  field: z.string().min(1),
  /** Human-readable message (English). */
  message: z.string().min(1),
});

export const ReaderOutputSchema = z.object({
  player: PlayerSchema,
  fee: FeeSchema,
  installments: z.array(InstallmentSchema).min(1),
  /** Absent for resale agreements (they carry no security, e.g. Deal 2). */
  collateral: CollateralSchema.optional(),
  sellOn: SellOnSchema,
  trainingClubs: z.array(TrainingClubSchema),
  warnings: z.array(WarningSchema),
});

export type ReaderOutput = z.infer<typeof ReaderOutputSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Fee = z.infer<typeof FeeSchema>;
export type Installment = z.infer<typeof InstallmentSchema>;
export type Collateral = z.infer<typeof CollateralSchema>;
export type SellOn = z.infer<typeof SellOnSchema>;
export type TrainingClub = z.infer<typeof TrainingClubSchema>;
export type Warning = z.infer<typeof WarningSchema>;
export type WarningCode = Warning["code"];
