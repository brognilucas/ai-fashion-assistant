import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  imageScreeningSchema,
  type ImageScreeningResult,
} from "@/lib/schemas/screening";
import {
  SCREENER_SYSTEM_PROMPT,
  SCREENER_USER_PROMPT,
} from "@/lib/prompts/screener";

export async function screenImage(
  base64Data: string,
  mimeType: string
): Promise<ImageScreeningResult> {
  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    system: SCREENER_SYSTEM_PROMPT,
    output: Output.object({
      schema: imageScreeningSchema,
      name: "ImageScreening",
      description:
        "Classification of whether the image contains a clothed human",
    }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: SCREENER_USER_PROMPT },
          {
            type: "image",
            image: base64Data,
            mediaType: mimeType,
          },
        ],
      },
    ],
  });

  if (!output) {
    throw new Error("Screening returned no output");
  }

  return output;
}
