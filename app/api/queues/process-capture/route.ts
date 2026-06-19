import { handleCallback } from "@vercel/queue";
import { loadConfig } from "@/config";
import { processCaptureJob } from "@/core/processCapture";
import type { CaptureJob } from "@/core/types";
import { createNotionStore } from "@/integrations/notionStore";
import { createOpenAiClient } from "@/integrations/openaiClient";
import { loadPrompts } from "@/integrations/prompts";
import { createTelegramClient } from "@/integrations/telegramClient";

export const runtime = "nodejs";

const queueHandler = handleCallback<CaptureJob>(async (message) => {
  const config = loadConfig();
  await processCaptureJob(message, {
    notion: createNotionStore(config),
    telegram: createTelegramClient(config.telegramBotToken),
    openai: createOpenAiClient(config),
    prompts: await loadPrompts()
  });
});

export function POST(request: Request): Promise<Response> {
  return queueHandler(request);
}
