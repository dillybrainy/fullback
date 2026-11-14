/**
 * agent/tests/config.test.ts
 * Env fallback: a line with an empty value (e.g. `LLM_API_KEY=` in .env) must
 * be treated as NOT set, so the NEARAI_* fallbacks and the default model still
 * apply. Bug found while running the live Reader test for issue #4.
 */

import { afterEach, describe, expect, it } from "vitest";
import { getApiKey, getModel, getRawBaseUrl } from "../config.js";

const SAVED = { ...process.env };

afterEach(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in SAVED)) delete process.env[k];
  }
  Object.assign(process.env, SAVED);
});

function setEnv(vars: Record<string, string>) {
  delete process.env.LLM_API_KEY;
  delete process.env.NEARAI_API_KEY;
  delete process.env.LLM_MODEL;
  delete process.env.NEARAI_MODEL;
  delete process.env.LLM_API_BASE_URL;
  delete process.env.NEARAI_API_BASE_URL;
  Object.assign(process.env, vars);
}

describe("config env fallback", () => {
  it("falls back to NEARAI_API_KEY when LLM_API_KEY is an empty string", () => {
    setEnv({ LLM_API_KEY: "", NEARAI_API_KEY: "near-key" });
    expect(getApiKey()).toBe("near-key");
  });

  it("prefers LLM_API_KEY when both are set", () => {
    setEnv({ LLM_API_KEY: "llm-key", NEARAI_API_KEY: "near-key" });
    expect(getApiKey()).toBe("llm-key");
  });

  it("returns undefined when every key is empty", () => {
    setEnv({ LLM_API_KEY: "", NEARAI_API_KEY: "" });
    expect(getApiKey()).toBeUndefined();
  });

  it("falls back to the default model when LLM_MODEL is empty", () => {
    setEnv({ LLM_MODEL: "", NEARAI_MODEL: "" });
    expect(getModel()).toBe("google/gemini-2.5-flash-lite");
  });

  it("falls back to NEARAI_MODEL when LLM_MODEL is empty", () => {
    setEnv({ LLM_MODEL: "", NEARAI_MODEL: "some/model" });
    expect(getModel()).toBe("some/model");
  });

  it("falls back to NEARAI_API_BASE_URL when LLM_API_BASE_URL is empty", () => {
    setEnv({
      LLM_API_BASE_URL: "",
      NEARAI_API_BASE_URL: "https://cloud-api.near.ai/v1",
    });
    expect(getRawBaseUrl()).toBe("https://cloud-api.near.ai/v1");
  });

  it("treats whitespace-only values as unset", () => {
    setEnv({ LLM_API_KEY: "   ", NEARAI_API_KEY: "near-key" });
    expect(getApiKey()).toBe("near-key");
  });
});
