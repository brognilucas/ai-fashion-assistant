/**
 * @jest-environment node
 */
const mockGenerateText = jest.fn();

jest.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  Output: { object: jest.fn((opts: unknown) => opts) },
}));

jest.mock("@ai-sdk/anthropic", () => ({
  anthropic: jest.fn(() => "mocked-model"),
}));

describe("screenImage", () => {
  let screenImage: (
    base64Data: string,
    mimeType: string
  ) => Promise<{ containsClothedHuman: boolean; reason: string }>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import("@/lib/screening/screenImage");
    screenImage = mod.screenImage;
  });

  it("returns screening result when image contains a clothed human", async () => {
    mockGenerateText.mockResolvedValue({
      output: {
        containsClothedHuman: true,
        reason: "Person wearing a blue blazer",
      },
    });

    const result = await screenImage("base64data", "image/jpeg");

    expect(result.containsClothedHuman).toBe(true);
    expect(result.reason).toBe("Person wearing a blue blazer");
  });

  it("returns screening result when image does not contain a clothed human", async () => {
    mockGenerateText.mockResolvedValue({
      output: {
        containsClothedHuman: false,
        reason: "Image shows a landscape with no people",
      },
    });

    const result = await screenImage("base64data", "image/jpeg");

    expect(result.containsClothedHuman).toBe(false);
    expect(result.reason).toBe("Image shows a landscape with no people");
  });

  it("calls generateText with the screening schema and image", async () => {
    mockGenerateText.mockResolvedValue({
      output: { containsClothedHuman: true, reason: "Person visible" },
    });

    await screenImage("abc123", "image/png");

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.system).toBeDefined();
    expect(callArgs.output).toBeDefined();
    expect(callArgs.messages[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          image: "abc123",
          mediaType: "image/png",
        }),
      ])
    );
  });

  it("throws when generateText returns null output", async () => {
    mockGenerateText.mockResolvedValue({ output: null });

    await expect(screenImage("base64data", "image/jpeg")).rejects.toThrow(
      /screening returned no output/i
    );
  });

  it("propagates errors from generateText", async () => {
    mockGenerateText.mockRejectedValue(new Error("API error"));

    await expect(screenImage("base64data", "image/jpeg")).rejects.toThrow(
      "API error"
    );
  });
});
