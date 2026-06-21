import type { SourceType } from "./types";

type RouteErrorContext = {
  error: unknown;
};

export type TelegramWebhookErrorContext = RouteErrorContext & {
  updateId?: number;
  chatId?: string;
};

export type TelegramFallbackErrorContext = RouteErrorContext & {
  chatId: string;
};

export type ProcessCaptureQueueErrorContext = RouteErrorContext & {
  noteId: string;
  chatId: string;
  messageId: string;
  sourceType: SourceType;
};

export type WeeklyCronErrorContext = RouteErrorContext & {
  force: boolean;
  recipientCount: number;
};

export function logTelegramWebhookError(
  context: TelegramWebhookErrorContext,
): void {
  logRouteError("Telegram webhook failed", context);
}

export function logTelegramFallbackError(
  context: TelegramFallbackErrorContext,
): void {
  logRouteError("Could not send Telegram fallback message", context);
}

export function logProcessCaptureQueueError(
  context: ProcessCaptureQueueErrorContext,
): void {
  logRouteError("Process capture queue job failed", context);
}

export function logWeeklyCronError(context: WeeklyCronErrorContext): void {
  logRouteError("Weekly cron route failed", context);
}

function logRouteError(
  message: string,
  context: RouteErrorContext,
): void {
  console.error(message, context);
}
