import { loadConfig } from "@/config";
import { allowsLocalForceRun } from "@/core/cron";
import { formatActive } from "@/core/format";
import { logWeeklyCronError } from "@/core/logging";
import { createNotionStore } from "@/integrations/notionStore";
import { createTelegramClient } from "@/integrations/telegramClient";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = loadConfig();
  const auth = request.headers.get("authorization");

  // `?force=1` is a local development escape hatch for manually testing the
  // weekly reminder route without waiting for Vercel Cron or sending the
  // bearer token. `allowsLocalForceRun` keeps this unavailable on Vercel and
  // on non-local hosts, so production still requires cron auth.
  const force = allowsLocalForceRun(request);

  if (!force && auth !== `Bearer ${config.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const notion = createNotionStore(config);
    const counts = await notion.activeCounts();
    const telegram = createTelegramClient(config.telegramBotToken);
    const [chatId] = config.allowedTelegramUserIds;

    await telegram.sendMessage({
      chatId,
      text: [
        "*Weekly check\\-in:*",
        formatActive(counts),
        "",
        "Use /active",
      ].join("\n"),
      markdown: true,
    });
  } catch (error) {
    logWeeklyCronError({
      error,
      force,
      recipientCount: config.allowedTelegramUserIds.length,
    });

    return new Response("Internal Server Error", { status: 500 });
  }

  return Response.json({ ok: true });
}
