import { APIErrorCode, APIResponseError } from "@notionhq/client";
import type * as NotionClientModule from "@notionhq/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@/config";
import { createNotionStore } from "@/integrations/notionStore";

const notionMock = vi.hoisted(() => ({
  retrieve: vi.fn(),
  create: vi.fn(),
  listChildren: vi.fn(),
}));

vi.mock("@notionhq/client", async (importActual) => {
  const actual = await importActual<typeof NotionClientModule>();

  return {
    ...actual,
    Client: vi.fn(() => ({
      pages: {
        retrieve: notionMock.retrieve,
        create: notionMock.create,
      },
      blocks: { children: { list: notionMock.listChildren } },
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
    notionMock.create.mockReset();
    notionMock.listChildren.mockReset();
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

  describe("createProject", () => {
    it("stores aliases as comma-separated rich text", async () => {
      notionMock.listChildren.mockResolvedValue({
        results: [
          { type: "child_database", id: "projects-db", child_database: { title: "Projects" } },
          { type: "child_database", id: "notes-db", child_database: { title: "Notes" } },
          { type: "child_database", id: "tasks-db", child_database: { title: "Tasks" } },
        ],
      });
      notionMock.create.mockResolvedValue({
        id: "project-1",
        url: "https://notion.so/project-1",
        properties: {
          Name: { title: [{ plain_text: "n8n-automation" }] },
          Aliases: {
            rich_text: [{ plain_text: "project memory bot, memory bot" }],
          },
          Status: { select: { name: "Active" } },
          "Project State": { rich_text: [] },
        },
      });

      const project = await createNotionStore(config).createProject(
        "n8n-automation",
        ["project memory bot", "memory bot"],
      );

      expect(notionMock.create.mock.calls[0]?.[0]).toMatchObject({
        parent: { database_id: "projects-db" },
        properties: {
          Aliases: {
            rich_text: [
              { text: { content: "project memory bot, memory bot" } },
            ],
          },
        },
      });
      expect(project.aliases).toEqual(["project memory bot", "memory bot"]);
    });
  });
});
