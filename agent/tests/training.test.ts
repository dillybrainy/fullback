import { describe, expect, it } from "vitest";
import { MAX_TRAINING_BPS, trainingBps } from "../training.js";

describe("trainingBps (KTD5: 0.25%/yr ages 12-15, 0.5%/yr ages 16-23, max 500)", () => {
  it("ages 12-15 give 100 bps (4 years × 25)", () => {
    expect(trainingBps(12, 15)).toBe(100);
  });

  it("ages 16-23 give 400 bps (8 years × 50)", () => {
    expect(trainingBps(16, 23)).toBe(400);
  });

  it("ages 12-23 give the 500 bps cap", () => {
    expect(trainingBps(12, 23)).toBe(500);
    expect(trainingBps(12, 23)).toBe(MAX_TRAINING_BPS);
  });

  it("a history starting at age 14 gives 50 bps for that club (2 years × 25)", () => {
    expect(trainingBps(14, 15)).toBe(50);
  });

  it("a history ending at age 16 gives 50 bps (1 year × 50)", () => {
    expect(trainingBps(16, 16)).toBe(50);
  });

  it("ages 24+ give 0 bps (club that only trained the adult player)", () => {
    expect(trainingBps(24, 26)).toBe(0);
  });

  it("ages below 12 give 0 bps", () => {
    expect(trainingBps(6, 9)).toBe(0);
  });

  it("a single age at 12 gives 25 bps", () => {
    expect(trainingBps(12, 12)).toBe(25);
  });

  it("rejects a reversed or non-integer range", () => {
    expect(() => trainingBps(18, 12)).toThrow();
    expect(() => trainingBps(12.5, 15)).toThrow();
  });

  it("rejects negative ages", () => {
    expect(() => trainingBps(-1, 5)).toThrow();
  });
});
