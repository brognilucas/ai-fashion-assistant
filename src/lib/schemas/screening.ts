import { z } from "zod";

export const imageScreeningSchema = z.object({
  containsClothedHuman: z
    .boolean()
    .describe("Whether the image contains at least one clothed human person"),
  reason: z
    .string()
    .describe("Brief explanation of what the image contains or why it was rejected"),
});

export type ImageScreeningResult = z.infer<typeof imageScreeningSchema>;
