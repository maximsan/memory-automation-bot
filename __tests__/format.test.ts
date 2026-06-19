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
});
