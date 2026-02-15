// eslint-disable-next-line @typescript-eslint/no-require-imports
const heicConvert = require("heic-convert") as (opts: {
  buffer: Buffer;
  format: "JPEG" | "PNG";
  quality?: number;
}) => Promise<Buffer>;
import { HEIC_MIME_TYPES } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

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

    const mimeType = dataUrlMatch[1];
    if (!(HEIC_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return Response.json(
        { error: "Only HEIC/HEIF images can be converted." },
        { status: 400 }
      );
    }

    const base64Data = image.split(",")[1];
    const inputBuffer = Buffer.from(base64Data, "base64");
    const jpegBuffer = await heicConvert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.92,
    });

    const jpegDataUrl = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;

    return Response.json({ image: jpegDataUrl });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    return Response.json(
      { error: "Failed to convert image. Please try again." },
      { status: 500 }
    );
  }
}