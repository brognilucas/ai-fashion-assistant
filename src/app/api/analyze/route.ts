import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require("heic-convert") as (opts: {
  buffer: Buffer;
  format: "JPEG" | "PNG";
  quality?: number;
}) => Promise<Buffer>;
import { outfitAnalysisSchema } from "@/lib/schemas/analysis";
import {
  STYLIST_SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/lib/prompts/stylist";
import {
  ACCEPTED_IMAGE_TYPES,
  HEIC_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/constants";
import { screenImage } from "@/lib/screening/screenImage";

export const maxDuration = 60;

const ALL_ACCEPTED_TYPES: readonly string[] = [
  ...ACCEPTED_IMAGE_TYPES,
  ...HEIC_MIME_TYPES,
];

function isHeicMimeType(mimeType: string): boolean {
  return (HEIC_MIME_TYPES as readonly string[]).includes(mimeType);
}

async function convertHeicToJpeg(base64Data: string): Promise<{
  base64Data: string;
  mimeType: string;
}> {
  const inputBuffer = Buffer.from(base64Data, "base64");
  const jpegBuffer = await heicConvert({
    buffer: inputBuffer,
    format: "JPEG",
    quality: 0.92,
  });
  return {
    base64Data: jpegBuffer.toString("base64"),
    mimeType: "image/jpeg",
  };
}


export async function POST(req: Request) {
  try {
    const { image, occasion, additionalContext } = await req.json();

    if (!image || typeof image !== "string") {
      return Response.json(
        { error: "Image is required. Send a base64 data URL." },
        { status: 400 }
      );
    }

    const dataUrlMatch = image.match(/^data:(image\/[\w+]+);base64,/);
    if (!dataUrlMatch) {
      return Response.json(
        { error: "Invalid image format. Expected a base64 data URL." },
        { status: 400 }
      );
    }

    const rawMimeType = dataUrlMatch[1];
    if (!ALL_ACCEPTED_TYPES.includes(rawMimeType)) {
      return Response.json(
        {
          error: `Unsupported image type: ${rawMimeType}. Accepted: ${ALL_ACCEPTED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    let base64Data = image.split(",")[1];
    const approximateBytes = (base64Data.length * 3) / 4;
    if (approximateBytes > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: "Image is too large. Maximum size is 4MB." },
        { status: 400 }
      );
    }

    let mimeType = rawMimeType;
    if (isHeicMimeType(rawMimeType)) {
      const converted = await convertHeicToJpeg(base64Data);
      base64Data = converted.base64Data;
      mimeType = converted.mimeType;
    }

    const screening = await screenImage(base64Data, mimeType);
    if (!screening.containsClothedHuman) {
      return Response.json(
        { error: screening.reason, code: "CONTENT_NOT_SUITABLE" },
        { status: 422 }
      );
    }

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system: STYLIST_SYSTEM_PROMPT,
      output: Output.object({
        schema: outfitAnalysisSchema,
        name: "OutfitAnalysis",
        description: "Complete outfit analysis with scores, summaries, and suggestions for each category",
      }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(
              typeof occasion === "string" && occasion ? occasion : undefined,
              typeof additionalContext === "string" && additionalContext ? additionalContext : undefined,
            ) },
            {
              type: "image",
              image: base64Data,
              mediaType: mimeType,
            },
          ],
        },
      ],
    });

    return Response.json(output);
  } catch (error) {
    console.error("Outfit analysis failed:", error);
    return Response.json(
      { error: "Failed to analyze the outfit. Please try again." },
      { status: 500 }
    );
  }
}