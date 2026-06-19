import { describe, expect, it, vi } from "vitest";
import { processCaptureJob } from "@/core/processCapture";
import type { NoteRecord, ProjectRecord } from "@/core/types";

describe("processCaptureJob", () => {
  it("updates the note and renders a review message", async () => {
    const project: ProjectRecord = {
      id: "project-1",
      name: "cleanup-photos",
      aliases: ["dedup"],
      status: "Active"
    };
    const note: NoteRecord = {
      id: "note-1",
      reviewStatus: "Needs Review",
      sourceType: "text",
      telegramChatId: "42",
      telegramMessageId: "10",
      telegramReviewMessageId: "20"
    };
    const editMessage = vi.fn().mockResolvedValue(undefined);

    await processCaptureJob(
      {
        noteId: "note-1",
        chatId: "42",
        messageId: "10",
        reviewMessageId: "20",
        sourceType: "text",
        text: "fixed ci"
      },
      {
        notion: {
          getNote: vi.fn().mockResolvedValue(note),
          listActiveProjects: vi.fn().mockResolvedValue([project]),
          updateNoteExtraction: vi.fn().mockResolvedValue({
            ...note,
            projectId: "project-1",
            cleanedSummary: "Fixed CI.",
            proposedTask: "Run visual tests."
          }),
          trashNote: vi.fn()
        },
        telegram: {
          getFileDownloadUrl: vi.fn(),
          editMessage
        },
        openai: {
          extract: vi.fn().mockResolvedValue({
            project: "cleanup-photos",
            summary: "Fixed CI.",
            proposedTask: "Run visual tests.",
            needsReviewReason: null
          })
        },
        prompts: { extractNote: "prompt" }
      }
    );

    expect(editMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "42",
        messageId: "20",
        markdown: true
      })
    );
  });
});
