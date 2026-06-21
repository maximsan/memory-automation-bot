import { describe, expect, it } from "vitest";
import { formatReviewMessage, reviewKeyboard } from "@/core/format";

describe("review formatting", () => {
  it("omits proposed task when absent", () => {
    const text = formatReviewMessage({
      projectName: "cleanup-photos",
      summary: "Fixed CI."
    });
    expect(text).toContain("*Project:* cleanup\\-photos");
    expect(text).not.toContain("Proposed task");
  });

  it("uses task-specific buttons when a proposed task exists", () => {
    const keyboard = reviewKeyboard("note-1", true);
    expect(keyboard[0].map((button) => button.text)).toEqual([
      "Approve + task",
      "Approve note only"
    ]);
  });

  it("escapes dynamic review fields for MarkdownV2", () => {
    const text = formatReviewMessage({
      projectName: "super-dooper",
      summary: "Deployed to Vercel. Next step: testing!",
      proposedTask: "Check /api/health."
    });

    expect(text).toContain("*Project:* super\\-dooper");
    expect(text).toContain("Deployed to Vercel\\. Next step: testing\\!");
    expect(text).toContain("Check /api/health\\.");
  });
});
