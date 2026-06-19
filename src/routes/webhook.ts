import type { AppConfig } from "@/config";
import {
  formatReviewMessage,
  reviewKeyboard,
  escapeTelegramMarkdown,
} from "@/core/format";
import {
  approveReviewedNote,
  buildProjectPicker,
  renderNoteReview,
  savedMessage,
  setProjectByPickerIndex,
} from "@/core/reviewActions";
import { parseTelegramUpdate, type TelegramUpdate } from "@/core/telegram";
import type { NotionStore } from "@/integrations/notionStore";
import type { OpenAiClient } from "@/integrations/openaiClient";
import type { PromptSet } from "@/integrations/prompts";
import type { TelegramClient } from "@/integrations/telegramClient";
import { enqueueCapture } from "@/integrations/queueClient";
import { handleCommand } from "./commands";
import type { CaptureJob } from "@/core/types";

export type WebhookDeps = {
  config: AppConfig;
  notion: NotionStore;
  telegram: TelegramClient;
  openai: OpenAiClient;
  prompts: PromptSet;
};

export async function handleTelegramWebhook(
  update: TelegramUpdate,
  deps: WebhookDeps,
): Promise<void> {
  const parsed = parseTelegramUpdate(
    update,
    deps.config.allowedTelegramUserIds,
  );

  if (parsed.kind === "unauthorized" || parsed.kind === "ignored") return;

  if (parsed.kind === "command") {
    if (parsed.command === "clean") {
      await cleanRecentMessages(parsed.chatId, deps);

      return;
    }

    const text = await handleCommand({
      command: parsed.command,
      args: parsed.args,
      notion: deps.notion,
      config: deps.config,
    });

    await deps.telegram.sendMessage({
      chatId: parsed.chatId,
      text,
      replyToMessageId: parsed.messageId,
      markdown: text.includes("*"),
    });

    return;
  }

  if (parsed.kind === "summaryEdit") {
    const note = await deps.notion.findNoteByReviewMessage(
      parsed.chatId,
      parsed.reviewMessageId,
    );

    if (!note) {
      return;
    }

    const updated = await deps.notion.updateNoteSummary(note.id, parsed.text);

    const project =
      updated.projectId ?
        await deps.notion.getProject(updated.projectId)
      : undefined;
    const review = renderNoteReview(updated, project);

    await deps.telegram.editMessage({
      chatId: parsed.chatId,
      messageId: parsed.reviewMessageId,
      text: review.text,
      keyboard: review.keyboard,
      markdown: true,
    });

    return;
  }

  if (parsed.kind === "callback") {
    await handleCallback(parsed, deps);

    return;
  }

  if (parsed.kind === "capture") {
    await handleCapture(parsed.job, deps);
  }
}

async function handleCapture(
  job: Omit<CaptureJob, "noteId" | "reviewMessageId">,
  deps: WebhookDeps,
): Promise<void> {
  if (
    job.sourceType === "text" &&
    job.text &&
    job.text.length > deps.config.maxTextChars
  ) {
    await deps.telegram.sendMessage({
      chatId: job.chatId,
      text: `Text is too long for v1. Limit: ${deps.config.maxTextChars} characters.`,
      replyToMessageId: job.messageId,
    });

    return;
  }

  if (
    job.sourceType === "voice" &&
    job.voiceDuration &&
    job.voiceDuration > deps.config.maxVoiceSeconds
  ) {
    await deps.telegram.sendMessage({
      chatId: job.chatId,
      text: `Voice note is too long for v1. Limit: ${deps.config.maxVoiceSeconds} seconds.`,
      replyToMessageId: job.messageId,
    });

    return;
  }

  const existing = await deps.notion.findNoteByTelegramMessage(
    job.chatId,
    job.messageId,
  );
  if (existing) {
    return;
  }

  const note = await deps.notion.createNoteFromCapture(job);
  const review = await deps.telegram.sendMessage({
    chatId: job.chatId,
    text: "Processing capture...",
    replyToMessageId: job.messageId,
  });
  await deps.notion.setReviewMessageId(note.id, review.messageId);
  await enqueueCapture({
    ...job,
    noteId: note.id,
    reviewMessageId: review.messageId,
  });
}

async function handleCallback(
  parsed: Extract<ReturnType<typeof parseTelegramUpdate>, { kind: "callback" }>,
  deps: WebhookDeps,
): Promise<void> {
  const [action, noteId, extra] = parsed.data.split(":");
  if (!parsed.chatId || !parsed.messageId || !noteId) return;
  await deps.telegram.answerCallbackQuery(parsed.callbackId);

  if (action === "rm") {
    await deps.notion.trashNote(noteId);
    await deps.telegram.editMessage({
      chatId: parsed.chatId,
      messageId: parsed.messageId,
      text: "Removed.",
    });
    return;
  }

  if (action === "ed") {
    await deps.telegram.editMessage({
      chatId: parsed.chatId,
      messageId: parsed.messageId,
      text: "Reply to this message with the corrected summary.",
    });
    return;
  }

  if (action === "wp") {
    const picker = await buildProjectPicker(noteId, deps);
    await deps.telegram.editMessage({
      chatId: parsed.chatId,
      messageId: parsed.messageId,
      text: picker.text,
      keyboard: picker.keyboard,
      markdown: true,
    });
    return;
  }

  if (action === "sp") {
    const { note, project } = await setProjectByPickerIndex(
      noteId,
      Number.parseInt(extra ?? "", 10),
      deps,
    );
    const review = renderNoteReview(note, project);
    await deps.telegram.editMessage({
      chatId: parsed.chatId,
      messageId: parsed.messageId,
      text: review.text,
      keyboard: review.keyboard,
      markdown: true,
    });
    return;
  }

  if (action === "an" || action === "at") {
    try {
      const result = await approveReviewedNote(noteId, action === "at", {
        notion: deps.notion,
        openai: deps.openai,
        prompts: deps.prompts,
        recentNotes: deps.config.recentNotes,
        maxTasks: deps.config.maxTasks,
      });
      await deps.telegram.editMessage({
        chatId: parsed.chatId,
        messageId: parsed.messageId,
        text: savedMessage(result.project, result.taskCreated),
        keyboard:
          result.project.url ?
            [[{ text: "Open project", url: result.project.url }]]
          : undefined,
        markdown: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not approve this note";
      await deps.telegram.editMessage({
        chatId: parsed.chatId,
        messageId: parsed.messageId,
        text: `Could not approve: ${message}`,
      });
    }
  }
}

async function cleanRecentMessages(
  chatId: string,
  deps: WebhookDeps,
): Promise<void> {
  const notes = await deps.notion.recentNotesForCleaning(20);
  let deleted = 0;
  for (const note of notes) {
    if (note.telegramChatId !== chatId) continue;
    for (const messageId of [
      note.telegramReviewMessageId,
      note.telegramMessageId,
    ].filter(Boolean) as string[]) {
      try {
        await deps.telegram.deleteMessage(chatId, messageId);
        deleted += 1;
      } catch {
        // Telegram refuses deletion for older messages. Ignore it.
      }
    }
  }

  await deps.telegram.sendMessage({
    chatId,
    text: `Cleaned ${deleted} recent temporary messages where Telegram allowed it.`,
  });
}
