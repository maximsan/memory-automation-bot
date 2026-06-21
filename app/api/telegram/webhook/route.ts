import { loadConfig } from "@/config";
import { createNotionStore } from "@/integrations/notionStore";
import { createOpenAiClient } from "@/integrations/openaiClient";
import { loadPrompts } from "@/integrations/prompts";
import { createTelegramClient } from "@/integrations/telegramClient";
import { handleTelegramWebhook } from "@/routes/webhook";
import { logRouteError } from "@/core/logging";
import type { TelegramUpdate } from "@/core/telegram";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let update: TelegramUpdate | undefined;
  let config: ReturnType<typeof loadConfig> | undefined;
  let telegram: ReturnType<typeof createTelegramClient> | undefined;

  try {
    update = (await request.json()) as TelegramUpdate;
    config = loadConfig();
    telegram = createTelegramClient(config.telegramBotToken);

    await handleTelegramWebhook(update, {
      config,
      notion: createNotionStore(config),
      telegram,
      openai: createOpenAiClient(config),
      prompts: await loadPrompts()
    });
  } catch (error) {
    logRouteError("Telegram webhook failed", {
      error,
      updateId: update?.update_id,
      chatId: chatIdFromUpdate(update)
    });
    await sendFallbackMessage(telegram, chatIdFromUpdate(update));
  }

  return Response.json({ ok: true });
}

function chatIdFromUpdate(update?: TelegramUpdate): string | undefined {
  const chatId = update?.message?.chat.id
    ?? update?.callback_query?.message?.chat.id;

  return chatId === undefined ? undefined : String(chatId);
}

async function sendFallbackMessage(
  telegram: ReturnType<typeof createTelegramClient> | undefined,
  chatId: string | undefined,
): Promise<void> {
  if (!telegram || !chatId) {
    return;
  }

  try {
    await telegram.sendMessage({
      chatId,
      text: "Something went wrong while processing that message. I logged the error. Please try again or use /help.",
    });
  } catch (error) {
    logRouteError("Could not send Telegram fallback message", {
      error,
      chatId,
    });
  }
}
