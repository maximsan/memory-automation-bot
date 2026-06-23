import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureJob } from "@/core/types";

vi.mock("@vercel/queue", () => ({
  handleCallback: vi.fn(
    (callback: (message: CaptureJob) => Promise<void>) =>
      async (request: Request) => {
        const message = (await request.json()) as CaptureJob;

        await callback(message);

        return Response.json({ ok: true });
      },
  ),
}));

vi.mock("@/core/processCapture", () => ({
  processCaptureJob: vi.fn(),
}));

import { processCaptureJob } from "@/core/processCapture";
import { POST } from "../app/api/queues/process-capture/route";

const originalEnv = { ...process.env };

describe("process capture queue route", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_ALLOWED_USER_IDS: "42",
      OPENAI_API_KEY: "openai-key",
      NOTION_TOKEN: "notion-token",
      NOTION_PARENT_PAGE_ID: "notion-parent",
      CRON_SECRET: "cron-secret",
    };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("logs queue job context and rethrows processing failures", async () => {
    const error = new Error("processing failed");
    vi.mocked(processCaptureJob).mockRejectedValue(error);

    const job: CaptureJob = {
      noteId: "note-1",
      chatId: "42",
      messageId: "10",
      reviewMessageId: "20",
      sourceType: "text",
      text: "fixed ci",
    };

    await expect(POST(
      new Request("https://example.com/api/queues/process-capture", {
        method: "POST",
        body: JSON.stringify(job),
      }),
    )).rejects.toThrow("processing failed");

    expect(console.error).toHaveBeenCalledWith(
      "Process capture queue job failed",
      {
        error,
        noteId: "note-1",
        chatId: "42",
        messageId: "10",
        sourceType: "text",
      },
    );
  });
});
