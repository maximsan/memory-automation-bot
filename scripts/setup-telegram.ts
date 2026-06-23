import nextEnv from "@next/env";
import { telegramMenuCommands } from "../src/core/commandDefinitions";
import { createTelegramClient } from "../src/integrations/telegramClient";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramBotToken) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

const telegram = createTelegramClient(telegramBotToken);
const commands = telegramMenuCommands();

await telegram.setMyCommands(commands);
await telegram.setChatMenuButton({ type: "commands" });

console.log(`Registered ${commands.length} Telegram command menu actions.`);
