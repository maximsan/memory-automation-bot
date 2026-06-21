import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/telegram/webhook/route";

const originalEnv = { ...process.env };

function telegramResponse(input: {
  ok: boolean;
  responseOk?: boolean;
  result?: unknown;
  description?: string;
}) {
  return {
    ok: input.responseOk ?? input.ok,
    json: () => Promise.resolve({
      ok: input.ok,
      result: input.result,
      description: input.description,
    }),
  };
}

describe("telegram webhook route", () => {
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
    vi.unstubAllGlobals();
  });

  it("sends a plain fallback when a Telegram reply fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(telegramResponse({ ok: true, result: true }))
      .mockResolvedValueOnce(
        telegramResponse({
          ok: false,
          responseOk: false,
          description: "Bad Request: can't parse entities",
        }),
      )
      .mockResolvedValueOnce(
        telegramResponse({
          ok: true,
          result: { message_id: 30 },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.com/api/telegram/webhook", {
        method: "POST",
        body: JSON.stringify({
          update_id: 1,
          message: {
            message_id: 10,
            from: { id: 42 },
            chat: { id: 42, type: "private" },
            text: "/help",
          },
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);

    const fallbackCall = fetchMock.mock.calls[2] as unknown as [
      string,
      { body: string },
    ];
    const fallbackBody = JSON.parse(fallbackCall[1].body) as {
      chat_id?: string;
      text?: string;
      parse_mode?: string;
    };

    expect(fallbackBody).toMatchObject({
      chat_id: "42",
      text: "Something went wrong while processing that message. I logged the error. Please try again or use /help.",
    });
    expect(fallbackBody.parse_mode).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "Telegram webhook failed",
      expect.objectContaining({
        updateId: 1,
        chatId: "42",
      }),
    );
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("logs fallback failure and still acknowledges Telegram", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(telegramResponse({ ok: true, result: true }))
      .mockResolvedValueOnce(
        telegramResponse({
          ok: false,
          responseOk: false,
          description: "Bad Request: can't parse entities",
        }),
      )
      .mockResolvedValueOnce(
        telegramResponse({
          ok: false,
          responseOk: false,
          description: "fallback down",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.com/api/telegram/webhook", {
        method: "POST",
        body: JSON.stringify({
          update_id: 2,
          message: {
            message_id: 10,
            from: { id: 42 },
            chat: { id: 42, type: "private" },
            text: "/help",
          },
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);

    expect(console.error).toHaveBeenCalledWith(
      "Could not send Telegram fallback message",
      expect.objectContaining({
        chatId: "42",
      }),
    );
  });
});
