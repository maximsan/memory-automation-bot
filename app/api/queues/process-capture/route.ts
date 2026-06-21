import { handleCallback } from "@vercel/queue";
import { loadConfig } from "@/config";
import { logRouteError } from "@/core/logging";
import { processCaptureJob } from "@/core/processCapture";
import type { CaptureJob } from "@/core/types";
import { createNotionStore } from "@/integrations/notionStore";
import { createOpenAiClient } from "@/integrations/openaiClient";
import { loadPrompts } from "@/integrations/prompts";
import { createTelegramClient } from "@/integrations/telegramClient";

export const runtime = "nodejs";

const queueHandler = handleCallback<CaptureJob>(async (message) => {
  try {
    const config = loadConfig();

    await processCaptureJob(message, {
      notion: createNotionStore(config),
      telegram: createTelegramClient(config.telegramBotToken),
      openai: createOpenAiClient(config),
      prompts: await loadPrompts(),
    });
  } catch (error) {
    logRouteError("Process capture queue job failed", {
      error,
      noteId: message.noteId,
      chatId: message.chatId,
      messageId: message.messageId,
      sourceType: message.sourceType,
    });

    throw error;
  }
});

export function POST(request: Request): Promise<Response> {
  return queueHandler(request);
}
