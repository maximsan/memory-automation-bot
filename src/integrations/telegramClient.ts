import type { TelegramKeyboard } from "@/core/types";

export type TelegramClient = {
  sendMessage(input: SendMessageInput): Promise<{ messageId: string }>;
  editMessage(input: EditMessageInput): Promise<void>;
  answerCallbackQuery(callbackId: string, text?: string): Promise<void>;
  sendChatAction(chatId: string, action: "typing"): Promise<void>;
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  getFileDownloadUrl(fileId: string): Promise<string>;
  setMyCommands(commands: TelegramBotCommand[]): Promise<void>;
  setChatMenuButton(menuButton: TelegramMenuButton): Promise<void>;
};

export type TelegramBotCommand = {
  command: string;
  description: string;
};

export type TelegramMenuButton = {
  type: "commands";
};

export type SendMessageInput = {
  chatId: string;
  text: string;
  replyToMessageId?: string;
  keyboard?: TelegramKeyboard;
  markdown?: boolean;
};

export type EditMessageInput = {
  chatId: string;
  messageId: string;
  text: string;
  keyboard?: TelegramKeyboard;
  markdown?: boolean;
};

export function createTelegramClient(botToken: string): TelegramClient {
  const baseUrl = `https://api.telegram.org/bot${botToken}`;

  async function callTelegram<T>(
    method: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${baseUrl}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      result?: T;
      description?: string;
    };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.description ?? `Telegram ${method} failed`);
    }

    return payload.result as T;
  }

  return {
    async sendMessage(input) {
      const result = await callTelegram<{ message_id: number }>("sendMessage", {
        chat_id: input.chatId,
        text: input.text,
        parse_mode: input.markdown ? "MarkdownV2" : undefined,
        reply_to_message_id: input.replyToMessageId,
        reply_markup:
          input.keyboard
            ? { inline_keyboard: toTelegramKeyboard(input.keyboard) }
            : undefined,
      });

      return { messageId: String(result.message_id) };
    },

    async editMessage(input) {
      await callTelegram("editMessageText", {
        chat_id: input.chatId,
        message_id: input.messageId,
        text: input.text,
        parse_mode: input.markdown ? "MarkdownV2" : undefined,
        reply_markup:
          input.keyboard
            ? { inline_keyboard: toTelegramKeyboard(input.keyboard) }
            : undefined,
      });
    },

    async answerCallbackQuery(callbackId, text) {
      await callTelegram("answerCallbackQuery", {
        callback_query_id: callbackId,
        text,
      });
    },

    async sendChatAction(chatId, action) {
      await callTelegram("sendChatAction", {
        chat_id: chatId,
        action,
      });
    },

    async deleteMessage(chatId, messageId) {
      await callTelegram("deleteMessage", {
        chat_id: chatId,
        message_id: messageId,
      });
    },

    async getFileDownloadUrl(fileId) {
      const result = await callTelegram<{ file_path: string }>("getFile", {
        file_id: fileId,
      });

      return `https://api.telegram.org/file/bot${botToken}/${result.file_path}`;
    },

    async setMyCommands(commands) {
      await callTelegram<boolean>("setMyCommands", {
        commands,
      });
    },

    async setChatMenuButton(menuButton) {
      await callTelegram<boolean>("setChatMenuButton", {
        menu_button: menuButton,
      });
    },
  };
}

function toTelegramKeyboard(keyboard: TelegramKeyboard) {
  return keyboard.map((row) =>
    row.map((button) => ({
      text: button.text,
      callback_data: button.callbackData,
      url: button.url,
    })),
  );
}
