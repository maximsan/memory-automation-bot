import { describe, expect, it } from "vitest";
import { parseAiExtraction } from "@/core/schema";

describe("parseAiExtraction", () => {
  it("normalizes nullable strings", () => {
    expect(
      parseAiExtraction({
        project: " cleanup-photos ",
        summary: " fixed ci ",
        proposedTask: "",
        needsReviewReason: null
      })
    ).toEqual({
      project: "cleanup-photos",
      summary: "fixed ci",
      proposedTask: null,
      needsReviewReason: null
    });
  });

  it("rejects invalid output", () => {
    expect(() => parseAiExtraction({ summary: 123 })).toThrow();
  });
});
