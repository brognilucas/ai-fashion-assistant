import {
  colorHarmonySchema,
  fitSchema,
  occasionSchema,
  accessoriesSchema,
  overallAssessmentSchema,
  type OutfitAnalysis,
} from "@/lib/schemas/analysis";

const validCategoryBase = {
  score: 7,
  summary: "Good color coordination",
  details: "The outfit uses complementary colors well",
  suggestions: ["Try adding a pop of color with accessories"],
};

describe("colorHarmonySchema", () => {
  it("validates correct data", () => {
    const result = colorHarmonySchema.safeParse(validCategoryBase);
    expect(result.success).toBe(true);
  });

  it("accepts any numeric score (range enforced by LLM via prompt)", () => {
    expect(colorHarmonySchema.safeParse({ ...validCategoryBase, score: 0 }).success).toBe(true);
    expect(colorHarmonySchema.safeParse({ ...validCategoryBase, score: 11 }).success).toBe(true);
  });

  it("rejects non-number score", () => {
    const result = colorHarmonySchema.safeParse({ ...validCategoryBase, score: "high" });
    expect(result.success).toBe(false);
  });

  it("rejects missing summary", () => {
    const { summary, ...rest } = validCategoryBase;
    const result = colorHarmonySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts empty suggestions array", () => {
    const result = colorHarmonySchema.safeParse({ ...validCategoryBase, suggestions: [] });
    expect(result.success).toBe(true);
  });
});

describe("fitSchema", () => {
  it("validates correct data", () => {
    const result = fitSchema.safeParse(validCategoryBase);
    expect(result.success).toBe(true);
  });

  it("accepts decimal scores (integer constraint removed for Anthropic structured output)", () => {
    const result = fitSchema.safeParse({ ...validCategoryBase, score: 7.5 });
    expect(result.success).toBe(true);
  });
});

describe("occasionSchema", () => {
  const validOccasion = {
    ...validCategoryBase,
    suitableOccasions: ["casual", "brunch"],
    unsuitableOccasions: ["black tie gala"],
  };

  it("validates correct data with occasion arrays", () => {
    const result = occasionSchema.safeParse(validOccasion);
    expect(result.success).toBe(true);
  });

  it("rejects missing suitableOccasions", () => {
    const { suitableOccasions, ...rest } = validOccasion;
    const result = occasionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing unsuitableOccasions", () => {
    const { unsuitableOccasions, ...rest } = validOccasion;
    const result = occasionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("accessoriesSchema", () => {
  it("validates correct data", () => {
    const result = accessoriesSchema.safeParse(validCategoryBase);
    expect(result.success).toBe(true);
  });
});

describe("overallAssessmentSchema", () => {
  const validOverall = {
    ...validCategoryBase,
    strengths: ["Great color coordination", "Well-fitted pants"],
    areasForImprovement: ["Add accessories"],
    styleProfile: "Casual Minimalist",
  };

  it("validates correct data", () => {
    const result = overallAssessmentSchema.safeParse(validOverall);
    expect(result.success).toBe(true);
  });

  it("rejects missing styleProfile", () => {
    const { styleProfile, ...rest } = validOverall;
    const result = overallAssessmentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing strengths", () => {
    const { strengths, ...rest } = validOverall;
    const result = overallAssessmentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
