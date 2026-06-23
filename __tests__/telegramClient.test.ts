import { afterEach, describe, expect, it, vi } from "vitest";
import { createTelegramClient } from "@/integrations/telegramClient";

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

function requestJsonBody(request: RequestInit): unknown {
  if (typeof request.body !== "string") {
    throw new Error("Expected Telegram request body to be JSON text");
  }

  return JSON.parse(request.body);
}

describe("createTelegramClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers native command menu commands", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      telegramResponse({ ok: true, result: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const telegram = createTelegramClient("telegram-token");
    const commands = [
      { command: "active", description: "show pending reviews and next work" },
      { command: "help", description: "show this" },
    ];

    await telegram.setMyCommands(commands);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = requestJsonBody(request) as {
      commands?: unknown;
    };

    expect(url).toBe("https://api.telegram.org/bottelegram-token/setMyCommands");
    expect(request.method).toBe("POST");
    expect(body.commands).toEqual(commands);
  });

  it("sets the menu button to open Telegram commands", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      telegramResponse({ ok: true, result: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const telegram = createTelegramClient("telegram-token");

    await telegram.setChatMenuButton({ type: "commands" });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = requestJsonBody(request) as {
      menu_button?: unknown;
    };

    expect(url).toBe(
      "https://api.telegram.org/bottelegram-token/setChatMenuButton",
    );
    expect(request.method).toBe("POST");
    expect(body.menu_button).toEqual({ type: "commands" });
  });
});
