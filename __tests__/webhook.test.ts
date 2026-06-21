import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleTelegramWebhook } from "@/routes/webhook";
import type { AppConfig } from "@/config";
import type { TelegramClient } from "@/integrations/telegramClient";
import type { NotionStore } from "@/integrations/notionStore";
import type { NoteRecord } from "@/core/types";

const enqueueCapture = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/queueClient", () => ({
  enqueueCapture,
}));

const config = {
  allowedTelegramUserIds: ["42"],
  maxTextChars: 8000,
  maxVoiceSeconds: 300,
  recentNotes: 3,
  maxTasks: 5,
} as AppConfig;

function createTelegram() {
  const sendMessage = vi.fn().mockResolvedValue({ messageId: "20" });
  const editMessage = vi.fn().mockResolvedValue(undefined);
  const sendChatAction = vi.fn().mockResolvedValue(undefined);
  const telegram: TelegramClient = {
    sendMessage,
    editMessage,
    answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    sendChatAction,
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    getFileDownloadUrl: vi.fn().mockResolvedValue("https://example.com/file"),
  };

  return { telegram, sendMessage, editMessage, sendChatAction };
}

function createNotion(overrides: Partial<NotionStore> = {}): NotionStore {
  return {
    findNoteByTelegramMessage: vi.fn().mockResolvedValue(null),
    createNoteFromCapture: vi.fn(),
    setReviewMessageId: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as NotionStore;
}

function textUpdate(text = "cleanup-photos: deployed to Vercel") {
  return {
    update_id: 1,
    message: {
      message_id: 10,
      from: { id: 42 },
      chat: { id: 42, type: "private" },
      text,
    },
  };
}

describe("handleTelegramWebhook", () => {
  beforeEach(() => {
    enqueueCapture.mockReset();
    enqueueCapture.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("acknowledges a text capture before queue processing", async () => {
    const note: NoteRecord = {
      id: "note-1",
      reviewStatus: "Needs Review",
      sourceType: "text",
      telegramChatId: "42",
      telegramMessageId: "10",
    };
    const { telegram, sendChatAction, sendMessage } = createTelegram();
    const notion = createNotion({
      createNoteFromCapture: vi.fn().mockResolvedValue(note),
    });

    await handleTelegramWebhook(textUpdate(), {
      config,
      notion,
      telegram,
      openai: {} as never,
      prompts: {} as never,
    });

    expect(sendChatAction).toHaveBeenCalledWith("42", "typing");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "42",
        replyToMessageId: "10",
        text: "Got it. Saving this as a draft...",
      }),
    );
    expect(enqueueCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: "note-1",
        reviewMessageId: "20",
      }),
    );
  });

  it("edits the acknowledgement when Notion save fails", async () => {
    const { telegram, editMessage } = createTelegram();
    const notion = createNotion({
      createNoteFromCapture: vi.fn().mockRejectedValue(new Error("notion down")),
    });

    await handleTelegramWebhook(textUpdate(), {
      config,
      notion,
      telegram,
      openai: {} as never,
      prompts: {} as never,
    });

    expect(editMessage).toHaveBeenCalledWith({
      chatId: "42",
      messageId: "20",
      text: "I could not save this to Notion. Please check the Notion setup and try again.",
    });
    expect(enqueueCapture).not.toHaveBeenCalled();
  });

  it("keeps the draft and explains when queueing fails", async () => {
    const note: NoteRecord = {
      id: "note-1",
      reviewStatus: "Needs Review",
      sourceType: "text",
      telegramChatId: "42",
      telegramMessageId: "10",
    };
    const { telegram, editMessage } = createTelegram();
    const setReviewMessageId = vi.fn().mockResolvedValue(undefined);
    const notion = createNotion({
      createNoteFromCapture: vi.fn().mockResolvedValue(note),
      setReviewMessageId,
    });
    enqueueCapture.mockRejectedValue(new Error("queue down"));

    await handleTelegramWebhook(textUpdate(), {
      config,
      notion,
      telegram,
      openai: {} as never,
      prompts: {} as never,
    });

    expect(setReviewMessageId).toHaveBeenCalledWith("note-1", "20");
    expect(editMessage).toHaveBeenCalledWith({
      chatId: "42",
      messageId: "20",
      text: "Saved the draft in Notion, but processing did not start. Try again later.",
    });
  });
});
