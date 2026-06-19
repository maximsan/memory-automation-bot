import { loadConfig } from "@/config";
import { formatActive } from "@/core/format";
import { createNotionStore } from "@/integrations/notionStore";
import { createTelegramClient } from "@/integrations/telegramClient";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = loadConfig();
  const auth = request.headers.get("authorization");
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (auth !== `Bearer ${config.cronSecret}` && !force) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!force && !isConfiguredReminderHour(config.timezone, config.weeklyReminderHour)) {
    return Response.json({ skipped: true });
  }

  const notion = createNotionStore(config);
  const counts = await notion.activeCounts();
  const telegram = createTelegramClient(config.telegramBotToken);
  const [chatId] = config.allowedTelegramUserIds;
  await telegram.sendMessage({
    chatId,
    text: ["*Weekly check-in:*", formatActive(counts), "", "Use /active"].join("\n"),
    markdown: true
  });
  return Response.json({ ok: true });
}

function isConfiguredReminderHour(timezone: string, hour: number): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const currentHour = Number(parts.find((part) => part.type === "hour")?.value);
  return weekday === "Mon" && currentHour === hour;
}
