import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeCounts: vi.fn(),
  sendMessage: vi.fn(),
  createNotionStore: vi.fn(),
  createTelegramClient: vi.fn(),
}));

vi.mock("@/integrations/notionStore", () => ({
  createNotionStore: mocks.createNotionStore,
}));

vi.mock("@/integrations/telegramClient", () => ({
  createTelegramClient: mocks.createTelegramClient,
}));

import { GET } from "../app/api/cron/weekly/route";

const originalEnv = { ...process.env };

describe("weekly cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_ALLOWED_USER_IDS: "42",
      OPENAI_API_KEY: "openai-key",
      NOTION_TOKEN: "notion-token",
      NOTION_PARENT_PAGE_ID: "notion-parent",
      CRON_SECRET: "cron-secret",
    };
    mocks.activeCounts.mockResolvedValue({
      needsReview: 1,
      proposedTasks: 2,
      nextTasks: 3,
      recentlyUpdatedProjects: 4,
    });
    mocks.sendMessage.mockResolvedValue({ messageId: "30" });
    mocks.createNotionStore.mockReturnValue({
      activeCounts: mocks.activeCounts,
    });
    mocks.createTelegramClient.mockReturnValue({
      sendMessage: mocks.sendMessage,
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns 401 without cron authorization", async () => {
    const response = await GET(
      new Request("https://example.com/api/cron/weekly"),
    );

    await expect(response.text()).resolves.toBe("Unauthorized");
    expect(response.status).toBe(401);
    expect(mocks.createNotionStore).not.toHaveBeenCalled();
  });

  it("returns 401 with wrong cron authorization", async () => {
    const response = await GET(
      new Request("https://example.com/api/cron/weekly", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );

    await expect(response.text()).resolves.toBe("Unauthorized");
    expect(response.status).toBe(401);
    expect(mocks.createNotionStore).not.toHaveBeenCalled();
  });

  it("returns 500 and logs when authenticated Notion work fails", async () => {
    const error = new Error("notion down");
    mocks.activeCounts.mockRejectedValue(error);

    const response = await GET(
      new Request("https://example.com/api/cron/weekly", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    await expect(response.text()).resolves.toBe("Internal Server Error");
    expect(response.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith("Weekly cron route failed", {
      error,
      force: false,
      recipientCount: 1,
    });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("sends the reminder and returns ok for authorized requests", async () => {
    const response = await GET(
      new Request("https://example.com/api/cron/weekly", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "42",
        markdown: true,
      }),
    );
  });
});
