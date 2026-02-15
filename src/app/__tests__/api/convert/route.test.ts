/**
 * @jest-environment node
 */

const mockHeicConvert = jest.fn();

jest.mock("heic-convert", () => mockHeicConvert);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/convert", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import("@/app/api/convert/route");
    POST = mod.POST;
  });

  it("returns 400 if no image is provided", async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for non-HEIC image", async () => {
    const res = await POST(
      createRequest({ image: "data:image/jpeg;base64,abc123" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/heic/i);
  });

  it("converts HEIC to JPEG and returns data URL", async () => {
    const fakeJpegBuffer = Buffer.from("fake-jpeg-data");
    mockHeicConvert.mockResolvedValue(fakeJpegBuffer);

    const res = await POST(
      createRequest({ image: "data:image/heic;base64,aGVpYy1kYXRh" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.image).toBe(
      `data:image/jpeg;base64,${fakeJpegBuffer.toString("base64")}`
    );
  });

  it("converts HEIF to JPEG and returns data URL", async () => {
    const fakeJpegBuffer = Buffer.from("fake-jpeg-data");
    mockHeicConvert.mockResolvedValue(fakeJpegBuffer);

    const res = await POST(
      createRequest({ image: "data:image/heif;base64,aGVpZi1kYXRh" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.image).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("returns 500 when conversion fails", async () => {
    mockHeicConvert.mockRejectedValue(new Error("decode error"));

    const res = await POST(
      createRequest({ image: "data:image/heic;base64,YmFkLWRhdGE=" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});