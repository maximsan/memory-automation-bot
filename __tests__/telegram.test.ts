import { describe, expect, it } from "vitest";
import { parseTelegramUpdate } from "@/core/telegram";

describe("parseTelegramUpdate", () => {
  it("parses commands", () => {
    const parsed = parseTelegramUpdate(
      {
        update_id: 1,
        message: {
          message_id: 10,
          from: { id: 42 },
          chat: { id: 42, type: "private" },
          text: "/project cleanup"
        }
      },
      ["42"]
    );

    expect(parsed).toEqual({
      kind: "command",
      chatId: "42",
      messageId: "10",
      command: "project",
      args: "cleanup"
    });
  });

  it("parses photo captures with captions as hints", () => {
    const parsed = parseTelegramUpdate(
      {
        update_id: 1,
        message: {
          message_id: 11,
          from: { id: 42 },
          chat: { id: 42, type: "private" },
          caption: "cleanup-photos",
          photo: [
            { file_id: "small", width: 100, height: 100 },
            { file_id: "large", width: 1000, height: 1000 }
          ]
        }
      },
      ["42"]
    );

    expect(parsed.kind).toBe("capture");
    if (parsed.kind === "capture") {
      expect(parsed.job).toMatchObject({
        sourceType: "photo",
        fileId: "large",
        userHint: "cleanup-photos"
      });
    }
  });

  it("rejects unauthorized users", () => {
    const parsed = parseTelegramUpdate(
      {
        update_id: 1,
        message: {
          message_id: 10,
          from: { id: 7 },
          chat: { id: 7, type: "private" },
          text: "hello"
        }
      },
      ["42"]
    );

    expect(parsed).toEqual({ kind: "unauthorized", userId: "7" });
  });
});
