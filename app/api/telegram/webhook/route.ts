import { loadConfig } from "@/config";
import { createNotionStore } from "@/integrations/notionStore";
import { createOpenAiClient } from "@/integrations/openaiClient";
import { loadPrompts } from "@/integrations/prompts";
import { createTelegramClient } from "@/integrations/telegramClient";
import { handleTelegramWebhook } from "@/routes/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = loadConfig();
  const update = await request.json();
  await handleTelegramWebhook(update, {
    config,
    notion: createNotionStore(config),
    telegram: createTelegramClient(config.telegramBotToken),
    openai: createOpenAiClient(config),
    prompts: await loadPrompts()
  });
  return Response.json({ ok: true });
}
