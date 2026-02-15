/**
 * @jest-environment node
 */
import type { OutfitAnalysis } from "@/lib/schemas/analysis";

const mockGenerateText = jest.fn();

jest.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  Output: { object: jest.fn((opts: unknown) => opts) },
}));

jest.mock("@ai-sdk/anthropic", () => ({
  anthropic: jest.fn(() => "mocked-model"),
}));

const mockHeicConvert = jest.fn();

jest.mock("heic-convert", () => mockHeicConvert);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SCREENING_PASS = {
  containsClothedHuman: true,
  reason: "Person wearing clothes",
};

function setupMockScreeningPass() {
  mockGenerateText.mockResolvedValueOnce({ output: SCREENING_PASS });
}

function setupMockScreeningFail(
  reason = "Image shows a landscape with no people"
) {
  mockGenerateText.mockResolvedValueOnce({
    output: { containsClothedHuman: false, reason },
  });
}

function setupMockAnalysis() {
  mockGenerateText.mockResolvedValueOnce({ output: MOCK_ANALYSIS });
}

const VALID_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

const MOCK_ANALYSIS: OutfitAnalysis = {
  colorHarmony: {
    score: 8,
    summary: "Great coordination",
    details: "Colors complement each other well",
    suggestions: [],
  },
  fit: {
    score: 7,
    summary: "Good fit overall",
    details: "Well-tailored pieces",
    suggestions: ["Consider a slimmer cut on the pants"],
  },
  occasionAppropriateness: {
    score: 8,
    summary: "Versatile outfit",
    suitableOccasions: ["casual", "brunch", "date night"],
    unsuitableOccasions: ["formal gala", "job interview"],
    details: "Works for most casual settings",
    suggestions: [],
  },
  accessories: {
    score: 6,
    summary: "Minimal accessories",
    details: "Could benefit from more accessories",
    suggestions: ["Add a watch", "Try a statement necklace"],
  },
  overallAssessment: {
    score: 7,
    summary: "Solid casual look",
    details: "Well-put-together outfit",
    suggestions: ["Add more accessories to complete the look"],
    strengths: ["Color coordination", "Fit"],
    areasForImprovement: ["Accessories"],
    styleProfile: "Casual Minimalist",
  },
};

describe("POST /api/analyze", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import("@/app/api/analyze/route");
    POST = mod.POST;
  });

  it("returns 400 if no image is provided", async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid data URL format", async () => {
    const res = await POST(createRequest({ image: "not-a-data-url" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("returns 400 for unsupported MIME type", async () => {
    const res = await POST(
      createRequest({ image: "data:image/bmp;base64,abc" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unsupported/i);
  });

  it("calls generateText with structured output and returns analysis", async () => {
    setupMockScreeningPass();
    setupMockAnalysis();

    const res = await POST(createRequest({ image: VALID_IMAGE }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.colorHarmony.score).toBe(8);
    expect(body.fit.score).toBe(7);
    expect(body.occasionAppropriateness.suitableOccasions).toContain("casual");
    expect(body.accessories.suggestions).toContain("Add a watch");
    expect(body.overallAssessment.styleProfile).toBe("Casual Minimalist");

    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    const analysisCallArgs = mockGenerateText.mock.calls[1][0];
    expect(analysisCallArgs.output).toBeDefined();
    expect(analysisCallArgs.tools).toBeUndefined();
  });

  it("returns 500 when screening throws", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("API error"));

    const res = await POST(createRequest({ image: VALID_IMAGE }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 500 when analysis throws after screening passes", async () => {
    setupMockScreeningPass();
    mockGenerateText.mockRejectedValueOnce(new Error("Analysis API error"));

    const res = await POST(createRequest({ image: VALID_IMAGE }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  describe("image content screening", () => {
    it("returns 422 when image does not contain a clothed human", async () => {
      setupMockScreeningFail("Image shows a cat sitting on a couch");

      const res = await POST(createRequest({ image: VALID_IMAGE }));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error).toBe("Image shows a cat sitting on a couch");
      expect(body.code).toBe("CONTENT_NOT_SUITABLE");
    });

    it("proceeds with analysis when screening passes", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(createRequest({ image: VALID_IMAGE }));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.colorHarmony.score).toBe(8);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it("does not call analysis when screening rejects", async () => {
      setupMockScreeningFail();

      await POST(createRequest({ image: VALID_IMAGE }));

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it("returns 500 when screening throws an error", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("Screening API error")
      );

      const res = await POST(createRequest({ image: VALID_IMAGE }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("screens after HEIC conversion (uses converted JPEG)", async () => {
      const fakeJpegBuffer = Buffer.from("fake-jpeg-data");
      mockHeicConvert.mockResolvedValue(fakeJpegBuffer);
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(
        createRequest({ image: "data:image/heic;base64,aGVpYy1kYXRh" })
      );
      expect(res.status).toBe(200);

      const screeningCallArgs = mockGenerateText.mock.calls[0][0];
      const imagePart = screeningCallArgs.messages[0].content.find(
        (part: { type: string }) => part.type === "image"
      );
      expect(imagePart.mediaType).toBe("image/jpeg");
      expect(imagePart.image).toBe(fakeJpegBuffer.toString("base64"));
    });

    it("includes screening reason in 422 response body", async () => {
      setupMockScreeningFail(
        "This appears to be a photo of food, not an outfit"
      );

      const res = await POST(createRequest({ image: VALID_IMAGE }));
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.error).toContain("food");
    });
  });

  describe("HEIC conversion", () => {
    it("converts HEIC to JPEG and sends to Claude", async () => {
      const fakeJpegBuffer = Buffer.from("fake-jpeg-data");
      mockHeicConvert.mockResolvedValue(fakeJpegBuffer);
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(
        createRequest({ image: "data:image/heic;base64,aGVpYy1kYXRh" })
      );
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const imagePart = analysisCallArgs.messages[0].content.find(
        (part: { type: string }) => part.type === "image"
      );
      expect(imagePart.mediaType).toBe("image/jpeg");
      expect(imagePart.image).toBe(fakeJpegBuffer.toString("base64"));
    });

    it("converts HEIF to JPEG and sends to Claude", async () => {
      const fakeJpegBuffer = Buffer.from("fake-jpeg-data");
      mockHeicConvert.mockResolvedValue(fakeJpegBuffer);
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(
        createRequest({ image: "data:image/heif;base64,aGVpZi1kYXRh" })
      );
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const imagePart = analysisCallArgs.messages[0].content.find(
        (part: { type: string }) => part.type === "image"
      );
      expect(imagePart.mediaType).toBe("image/jpeg");
    });

    it("returns 500 when HEIC conversion fails", async () => {
      mockHeicConvert.mockRejectedValue(
        new Error("heic-convert decode error")
      );

      const res = await POST(
        createRequest({ image: "data:image/heic;base64,YmFkLWRhdGE=" })
      );
      expect(res.status).toBe(500);
    });
  });

  describe("occasion parameter", () => {
    it("includes occasion in the user prompt when provided", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      await POST(
        createRequest({ image: VALID_IMAGE, occasion: "job interview" })
      );

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).toContain("job interview");
    });

    it("works without occasion (backward compatible)", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(createRequest({ image: VALID_IMAGE }));
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).not.toContain("occasion");
    });

    it("ignores occasion if it is not a string", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(
        createRequest({ image: VALID_IMAGE, occasion: 123 })
      );
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).not.toContain("123");
    });

    it("ignores occasion if it is an empty string", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(
        createRequest({ image: VALID_IMAGE, occasion: "" })
      );
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).not.toContain("occasion");
    });
  });

  describe("additionalContext parameter", () => {
    it("includes additionalContext in the user prompt when provided", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      await POST(
        createRequest({
          image: VALID_IMAGE,
          additionalContext: "I plan to wear different shoes",
        })
      );

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).toContain("I plan to wear different shoes");
      expect(textPart.text).toContain("Additional context");
    });

    it("includes both occasion and additionalContext when both provided", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      await POST(
        createRequest({
          image: VALID_IMAGE,
          occasion: "wedding",
          additionalContext: "outdoor ceremony",
        })
      );

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).toContain("wedding");
      expect(textPart.text).toContain("outdoor ceremony");
    });

    it("works without additionalContext (backward compatible)", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(createRequest({ image: VALID_IMAGE }));
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).not.toContain("Additional context");
    });

    it("ignores additionalContext if it is not a string", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(
        createRequest({ image: VALID_IMAGE, additionalContext: 123 })
      );
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).not.toContain("123");
    });

    it("ignores additionalContext if it is an empty string", async () => {
      setupMockScreeningPass();
      setupMockAnalysis();

      const res = await POST(
        createRequest({ image: VALID_IMAGE, additionalContext: "" })
      );
      expect(res.status).toBe(200);

      const analysisCallArgs = mockGenerateText.mock.calls[1][0];
      const userMessage = analysisCallArgs.messages[0];
      const textPart = userMessage.content.find(
        (part: { type: string }) => part.type === "text"
      );
      expect(textPart.text).not.toContain("Additional context");
    });
  });
});
