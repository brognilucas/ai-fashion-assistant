import {
  SCREENER_SYSTEM_PROMPT,
  SCREENER_USER_PROMPT,
} from "@/lib/prompts/screener";

describe("SCREENER_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof SCREENER_SYSTEM_PROMPT).toBe("string");
    expect(SCREENER_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("mentions clothed human classification", () => {
    expect(SCREENER_SYSTEM_PROMPT).toMatch(/clothed human/i);
  });

  it("instructs not to analyze fashion", () => {
    expect(SCREENER_SYSTEM_PROMPT).toMatch(/do not analyze/i);
  });
});

describe("SCREENER_USER_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof SCREENER_USER_PROMPT).toBe("string");
    expect(SCREENER_USER_PROMPT.length).toBeGreaterThan(0);
  });

  it("asks about clothed human content", () => {
    expect(SCREENER_USER_PROMPT).toMatch(/clothed human/i);
  });
});
