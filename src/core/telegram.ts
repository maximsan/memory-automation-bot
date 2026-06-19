import type { CaptureJob, SourceType } from "./types";

export type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

export type TelegramChat = {
  id: number;
  type: string;
};

export type TelegramPhotoSize = {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  voice?: {
    file_id: string;
    duration?: number;
    mime_type?: string;
    file_size?: number;
  };
  reply_to_message?: TelegramMessage;
  forward_origin?: unknown;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type ParsedTelegramUpdate = | { kind: "unauthorized"; userId?: string }
  | {
    kind: "command";
    chatId: string;
    messageId: string;
    command: string;
    args: string;
  }
  | { kind: "capture"; job: Omit<CaptureJob, "noteId" | "reviewMessageId"> }
  | {
    kind: "summaryEdit";
    chatId: string;
    messageId: string;
    reviewMessageId: string;
    text: string;
  }
  | {
    kind: "callback";
    callbackId: string;
    userId: string;
    chatId?: string;
    messageId?: string;
    data: string;
  }
  | { kind: "ignored" };

/**
 * Converts raw Telegram webhook payloads into the bot's small internal event
 * union. Keeping this parser pure makes command/capture/callback behavior easy
 * to test without a live Telegram bot.
 */
export function parseTelegramUpdate(
  update: TelegramUpdate,
  allowedUserIds: string[],
): ParsedTelegramUpdate {
  if (update.callback_query) {
    const userId = String(update.callback_query.from.id);

    if (!allowedUserIds.includes(userId)) {
      return { kind: "unauthorized", userId };
    }

    return {
      kind: "callback",
      callbackId: update.callback_query.id,
      userId,
      chatId:
        update.callback_query.message
          ? String(update.callback_query.message.chat.id)
          : undefined,
      messageId:
        update.callback_query.message
          ? String(update.callback_query.message.message_id)
          : undefined,
      data: update.callback_query.data ?? "",
    };
  }

  const message = update.message;

  if (!message) {
    return { kind: "ignored" };
  }

  const userId = message.from ? String(message.from.id) : undefined;

  if (!userId || !allowedUserIds.includes(userId)) {
    return { kind: "unauthorized", userId };
  }

  const chatId = String(message.chat.id);
  const messageId = String(message.message_id);

  // In v1, replying to a review message with plain text means "replace the
  // summary". It avoids a separate edit wizard in Telegram.
  if (
    message.reply_to_message
    && message.text
    && !message.text.startsWith("/")
  ) {
    return {
      kind: "summaryEdit",
      chatId,
      messageId,
      reviewMessageId: String(message.reply_to_message.message_id),
      text: message.text,
    };
  }

  if (message.text?.startsWith("/")) {
    const [rawCommand, ...rest] = message.text.trim().split(/\s+/);

    return {
      kind: "command",
      chatId,
      messageId,
      command: rawCommand.replace(/^\/+/, "").split("@")[0].toLowerCase(),
      args: rest.join(" ").trim(),
    };
  }

  const capture = captureFromMessage(message);

  if (!capture) {
    return { kind: "ignored" };
  }

  return { kind: "capture", job: capture };
}

function captureFromMessage(
  message: TelegramMessage,
): Omit<CaptureJob, "noteId" | "reviewMessageId"> | null {
  const chatId = String(message.chat.id);
  const messageId = String(message.message_id);
  const userHint = message.caption?.trim() || undefined;

  if (message.text) {
    return {
      chatId,
      messageId,
      sourceType: "text",
      text: message.text,
      userHint,
    };
  }

  if (message.photo?.length) {
    // Telegram sends multiple photo sizes. The largest gives OpenAI the best
    // chance to read handwriting without storing original media in Notion.
    const largest = [...message.photo].sort(
      (a, b) => b.width * b.height - a.width * a.height,
    )[0];

    return {
      chatId,
      messageId,
      sourceType: "photo",
      fileId: largest.file_id,
      userHint,
    };
  }

  if (message.voice) {
    return {
      chatId,
      messageId,
      sourceType: "voice",
      fileId: message.voice.file_id,
      voiceDuration: message.voice.duration,
      userHint,
    };
  }

  return null;
}

export function titleForSource(
  sourceType: SourceType,
  messageId: string,
): string {
  return `${sourceType} capture ${messageId}`;
}
