import { APIErrorCode, APIResponseError } from "@notionhq/client";
import type * as NotionClientModule from "@notionhq/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@/config";
import { createNotionStore } from "@/integrations/notionStore";

const notionMock = vi.hoisted(() => ({
  retrieve: vi.fn(),
}));

vi.mock("@notionhq/client", async (importActual) => {
  const actual = await importActual<typeof NotionClientModule>();

  return {
    ...actual,
    Client: vi.fn(() => ({
      pages: { retrieve: notionMock.retrieve },
    })),
  };
});

const config: AppConfig = {
  telegramBotToken: "telegram-token",
  allowedTelegramUserIds: ["42"],
  openaiApiKey: "openai-key",
  openaiTextModel: "gpt-4.1-mini",
  openaiVisionModel: "gpt-4.1-mini",
  openaiTranscribeModel: "gpt-4o-mini-transcribe",
  notionToken: "notion-token",
  notionParentPageId: "notion-parent",
  cronSecret: "cron-secret",
  maxTextChars: 4000,
  maxVoiceSeconds: 60,
  dailyCaptureSoftLimit: 20,
  dailyCaptureHardLimit: 30,
  recentNotes: 3,
  maxTasks: 5,
};

function apiResponseError(code: APIErrorCode): APIResponseError {
  return new APIResponseError({
    code,
    status: 404,
    message: "Notion API error",
    headers: {},
    rawBodyText: "{}",
  });
}

describe("createNotionStore", () => {
  beforeEach(() => {
    notionMock.retrieve.mockReset();
  });

  describe("getNote", () => {
    it("returns null when Notion reports the note object is not found", async () => {
      notionMock.retrieve.mockRejectedValue(
        apiResponseError(APIErrorCode.ObjectNotFound),
      );

      await expect(
        createNotionStore(config).getNote("note-1"),
      ).resolves.toBeNull();
      expect(notionMock.retrieve).toHaveBeenCalledWith({ page_id: "note-1" });
    });

    it("rethrows generic Notion lookup failures", async () => {
      const error = new Error("notion down");
      notionMock.retrieve.mockRejectedValue(error);

      await expect(
        createNotionStore(config).getNote("note-1"),
      ).rejects.toThrow(error);
    });
  });
});
