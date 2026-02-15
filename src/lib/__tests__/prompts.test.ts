import { buildUserPrompt } from "@/lib/prompts/stylist";

describe("buildUserPrompt", () => {
  it("returns base prompt when no occasion or additionalContext", () => {
    const result = buildUserPrompt();
    expect(result).toContain("analyze this outfit");
    expect(result).not.toContain("occasion");
    expect(result).not.toContain("Additional context");
  });

  it("includes occasion when provided", () => {
    const result = buildUserPrompt("job interview");
    expect(result).toContain("job interview");
  });

  it("includes additionalContext when provided", () => {
    const result = buildUserPrompt(undefined, "I plan to wear different shoes");
    expect(result).toContain("I plan to wear different shoes");
    expect(result).toContain("Additional context");
  });

  it("includes both occasion and additionalContext when both provided", () => {
    const result = buildUserPrompt("wedding", "It will be an outdoor event");
    expect(result).toContain("wedding");
    expect(result).toContain("It will be an outdoor event");
    expect(result).toContain("Additional context");
  });
});