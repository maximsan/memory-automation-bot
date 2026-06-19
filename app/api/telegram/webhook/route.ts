import { loadConfig } from "@/config";
import { createNotionStore } from "@/integrations/notionStore";
import { createOpenAiClient } from "@/integrations/openaiClient";
import { loadPrompts } from "@/integrations/prompts";
import { createTelegramClient } from "@/integrations/telegramClient";
import { handleTelegramWebhook } from "@/routes/webhook";
import type { TelegramUpdate } from "@/core/telegram";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = loadConfig();
  const update: unknown = await request.json();

  await handleTelegramWebhook(update as TelegramUpdate, {
    config,
    notion: createNotionStore(config),
    telegram: createTelegramClient(config.telegramBotToken),
    openai: createOpenAiClient(config),
    prompts: await loadPrompts()
  });

  return Response.json({ ok: true });
}
