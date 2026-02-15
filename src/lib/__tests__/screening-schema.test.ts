import { imageScreeningSchema } from "@/lib/schemas/screening";

describe("imageScreeningSchema", () => {
  it("validates a passing screening result", () => {
    const result = imageScreeningSchema.safeParse({
      containsClothedHuman: true,
      reason: "Person wearing a blue blazer and khaki pants",
    });
    expect(result.success).toBe(true);
  });

  it("validates a failing screening result", () => {
    const result = imageScreeningSchema.safeParse({
      containsClothedHuman: false,
      reason: "Image shows a landscape with no people",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing containsClothedHuman", () => {
    const result = imageScreeningSchema.safeParse({
      reason: "Some reason",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing reason", () => {
    const result = imageScreeningSchema.safeParse({
      containsClothedHuman: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean containsClothedHuman", () => {
    const result = imageScreeningSchema.safeParse({
      containsClothedHuman: "yes",
      reason: "Some reason",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string reason", () => {
    const result = imageScreeningSchema.safeParse({
      containsClothedHuman: true,
      reason: 42,
    });
    expect(result.success).toBe(false);
  });
});
