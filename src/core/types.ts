export type SourceType = "text" | "photo" | "voice";

export type ReviewStatus = "Needs Review" | "Approved" | "Error";

export type TaskStatus = "Proposed" | "Next" | "Doing" | "Blocked" | "Done";

export type ProjectStatus = "Active" | "Paused" | "Done" | "Archived";

export type ProjectRecord = {
  id: string;
  name: string;
  aliases: string[];
  status: ProjectStatus;
  projectState?: string;
  url?: string;
};

export type NoteRecord = {
  id: string;
  projectId?: string;
  reviewStatus: ReviewStatus;
  sourceType: SourceType;
  originalText?: string;
  cleanedSummary?: string;
  proposedTask?: string;
  userHint?: string;
  telegramChatId: string;
  telegramMessageId: string;
  telegramReviewMessageId?: string;
  url?: string;
};

export type TaskRecord = {
  id: string;
  name: string;
  projectId?: string;
  status: TaskStatus;
  url?: string;
};

export type CaptureJob = {
  noteId: string;
  chatId: string;
  messageId: string;
  reviewMessageId?: string;
  sourceType: SourceType;
  text?: string;
  userHint?: string;
  fileId?: string;
  voiceDuration?: number;
};

export type AiExtraction = {
  project: string | null;
  summary: string;
  proposedTask: string | null;
  needsReviewReason: string | null;
};

export type TelegramButton = {
  text: string;
  callbackData?: string;
  url?: string;
};

export type TelegramKeyboard = TelegramButton[][];
