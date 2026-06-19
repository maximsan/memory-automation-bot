import botDefaults from "../config/bot.json";

export type AppConfig = {
  telegramBotToken: string;
  allowedTelegramUserIds: string[];
  openaiApiKey: string;
  openaiTextModel: string;
  openaiVisionModel: string;
  openaiTranscribeModel: string;
  notionToken: string;
  notionParentPageId: string;
  cronSecret: string;
  timezone: string;
  weeklyReminderDay: number;
  weeklyReminderHour: number;
  maxTextChars: number;
  maxVoiceSeconds: number;
  dailyCaptureSoftLimit: number;
  dailyCaptureHardLimit: number;
  recentNotes: number;
  maxTasks: number;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return parsed;
}

export function loadConfig(): AppConfig {
  return {
    telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
    allowedTelegramUserIds: required("TELEGRAM_ALLOWED_USER_IDS")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    openaiApiKey: required("OPENAI_API_KEY"),
    openaiTextModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
    openaiVisionModel: process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini",
    openaiTranscribeModel:
      process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
    notionToken: required("NOTION_TOKEN"),
    notionParentPageId: required("NOTION_PARENT_PAGE_ID"),
    cronSecret: required("CRON_SECRET"),
    timezone: process.env.BOT_TIMEZONE ?? botDefaults.timezone,
    weeklyReminderDay: numberEnv(
      "WEEKLY_REMINDER_DAY",
      botDefaults.weeklyReminder.day
    ),
    weeklyReminderHour: numberEnv(
      "WEEKLY_REMINDER_HOUR",
      botDefaults.weeklyReminder.hour
    ),
    maxTextChars: numberEnv("MAX_TEXT_CHARS", botDefaults.limits.maxTextChars),
    maxVoiceSeconds: numberEnv(
      "MAX_VOICE_SECONDS",
      botDefaults.limits.maxVoiceSeconds
    ),
    dailyCaptureSoftLimit: numberEnv(
      "DAILY_CAPTURE_SOFT_LIMIT",
      botDefaults.limits.dailyCaptureSoftLimit
    ),
    dailyCaptureHardLimit: numberEnv(
      "DAILY_CAPTURE_HARD_LIMIT",
      botDefaults.limits.dailyCaptureHardLimit
    ),
    recentNotes: botDefaults.projectView.recentNotes,
    maxTasks: botDefaults.projectView.maxTasks
  };
}
