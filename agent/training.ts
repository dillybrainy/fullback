/**
 * training.ts — Academy royalty (solidarity) bps, computed by code (KTD5).
 *
 * The LLM only extracts club names and the age range each club trained the
 * player. The bps are NEVER taken from the model: they are computed here from
 * the FIFA solidarity schedule that FULLBACK implements:
 *
 *   - 0.25% per year for ages 12–15  (25 bps per year)
 *   - 0.50% per year for ages 16–23  (50 bps per year)
 *   - maximum 500 bps (5%) per deal
 *
 * PLAN.md R3: Akademi Desa (12–15, 4 years) → 100 bps; Kota FC (16–23,
 * 8 years) → 400 bps. Both verified in tests.
 */

/** 0.25% per year = 25 basis points. */
export const BPS_PER_YEAR_12_15 = 25;
/** 0.50% per year = 50 basis points. */
export const BPS_PER_YEAR_16_23 = 50;
/** Solidarity is capped at 5% (500 bps), like FIFA's Article 21. */
export const MAX_TRAINING_BPS = 500;

/**
 * Solidarity bps for one club that trained the player from `ageFrom` to
 * `ageTo`, both inclusive ("12 to 15" means ages 12, 13, 14, 15).
 *
 * Ages outside 12–23 contribute nothing (e.g. a club that only trained the
 * player from age 24 gets 0 bps). A single club can never exceed 500 bps.
 *
 * @throws if `ageFrom > ageTo`.
 */
export function trainingBps(ageFrom: number, ageTo: number): number {
  if (!Number.isInteger(ageFrom) || !Number.isInteger(ageTo)) {
    throw new Error(`trainingBps: ages must be integers, got ${ageFrom}–${ageTo}`);
  }
  if (ageFrom < 0 || ageTo < 0) {
    throw new Error(`trainingBps: ages must be non-negative, got ${ageFrom}–${ageTo}`);
  }
  if (ageFrom > ageTo) {
    throw new Error(`trainingBps: ageFrom ${ageFrom} must not be after ageTo ${ageTo}`);
  }
  let bps = 0;
  for (let age = ageFrom; age <= ageTo; age++) {
    if (age >= 12 && age <= 15) bps += BPS_PER_YEAR_12_15;
    else if (age >= 16 && age <= 23) bps += BPS_PER_YEAR_16_23;
  }
  return Math.min(bps, MAX_TRAINING_BPS);
}
