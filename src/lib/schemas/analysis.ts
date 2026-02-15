import { z } from "zod";

const categoryBaseSchema = z.object({
  score: z.number().describe("Score from 1 to 10"),
  summary: z.string().describe("Brief assessment"),
  details: z.string().describe("Detailed analysis"),
  suggestions: z.array(z.string()).describe("Specific improvement suggestions"),
});

export const colorHarmonySchema = categoryBaseSchema.describe(
  "Analysis of color coordination in the outfit"
);

export const fitSchema = categoryBaseSchema.describe(
  "Analysis of how garments fit the body"
);

export const occasionSchema = categoryBaseSchema
  .extend({
    suitableOccasions: z
      .array(z.string())
      .describe("Occasions this outfit suits"),
    unsuitableOccasions: z
      .array(z.string())
      .describe("Occasions to avoid with this outfit"),
  })
  .describe("Analysis of occasion appropriateness");

export const accessoriesSchema = categoryBaseSchema.describe(
  "Analysis of accessories, shoes, bags visible in the outfit"
);

export const overallAssessmentSchema = categoryBaseSchema
  .extend({
    strengths: z.array(z.string()).describe("Key strengths of the outfit"),
    areasForImprovement: z
      .array(z.string())
      .describe("Areas that could be improved"),
    styleProfile: z
      .string()
      .describe("Style category, e.g. 'Casual Minimalist', 'Smart Casual'"),
  })
  .describe("Overall holistic assessment of the outfit");

export const outfitAnalysisSchema = z.object({
  colorHarmony: colorHarmonySchema,
  fit: fitSchema,
  occasionAppropriateness: occasionSchema,
  accessories: accessoriesSchema,
  overallAssessment: overallAssessmentSchema,
});

export type OutfitAnalysis = z.infer<typeof outfitAnalysisSchema>;