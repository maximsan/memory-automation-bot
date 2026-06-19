import { Effect } from "effect";
import { IntegrationError, ProcessingError } from "./errors";
import { formatReviewMessage, reviewKeyboard } from "./format";
import { matchProject } from "./projectMatcher";
import type {
  AiExtraction,
  CaptureJob,
  NoteRecord,
  ProjectRecord,
  TaskRecord,
} from "./types";

export type ProcessCaptureDeps = {
  notion: {
    getNote(noteId: string): Promise<NoteRecord | null>;
    listActiveProjects(): Promise<ProjectRecord[]>;
    updateNoteExtraction(input: {
      noteId: string;
      projectId?: string;
      summary: string;
      proposedTask?: string;
    }): Promise<NoteRecord>;
    trashNote(noteId: string): Promise<void>;
  };
  telegram: {
    getFileDownloadUrl(fileId: string): Promise<string>;
    editMessage(input: {
      chatId: string;
      messageId: string;
      text: string;
      keyboard?: ReturnType<typeof reviewKeyboard>;
      markdown?: boolean;
    }): Promise<void>;
  };
  openai: {
    extract(input: {
      job: CaptureJob;
      knownProjects: ProjectRecord[];
      prompt: string;
      telegramFileUrl?: string;
    }): Promise<AiExtraction>;
  };
  prompts: {
    extractNote: string;
  };
};

export function processCaptureJobEffect(
  job: CaptureJob,
  deps: ProcessCaptureDeps,
) {
  return Effect.gen(function* () {
    const note = yield* tryNotion(() => deps.notion.getNote(job.noteId));
    if (!note) {
      return;
    }

    if (
      job.sourceType === "voice" &&
      job.voiceDuration &&
      job.voiceDuration > 300
    ) {
      yield* totalFailure(
        job,
        deps,
        "Voice note is too long. Please keep v1 voice notes under 5 minutes.",
      );
      return;
    }

    const projects = yield* tryNotion(() => deps.notion.listActiveProjects());
    const telegramFileUrl =
      job.fileId ?
        yield* tryTelegram(() =>
          deps.telegram.getFileDownloadUrl(job.fileId as string),
        )
      : undefined;

    const extraction = yield* Effect.tryPromise({
      try: () =>
        deps.openai.extract({
          job,
          knownProjects: projects,
          prompt: deps.prompts.extractNote,
          telegramFileUrl,
        }),
      catch: (cause) =>
        new IntegrationError({
          service: "openai",
          message: "Could not extract capture content",
          cause,
        }),
    }).pipe(
      Effect.catchTag("IntegrationError", (error) =>
        totalFailure(
          job,
          deps,
          "Could not process this capture. Please resubmit it.",
        ).pipe(Effect.zipRight(Effect.fail(error))),
      ),
    );

    if (!extraction.summary) {
      yield* totalFailure(
        job,
        deps,
        "Could not read this capture. Please resubmit it.",
      );

      return;
    }

    const matchedProject = matchProject(extraction.project, projects);
    const project =
      matchedProject.kind === "matched" ? matchedProject.project : undefined;

    const updatedNote = yield* tryNotion(() =>
      deps.notion.updateNoteExtraction({
        noteId: job.noteId,
        projectId: project?.id,
        summary: extraction.summary,
        proposedTask: extraction.proposedTask ?? undefined,
      }),
    );

    if (job.reviewMessageId) {
      yield* tryTelegram(() =>
        deps.telegram.editMessage({
          chatId: job.chatId,
          messageId: job.reviewMessageId!,
          text: formatReviewMessage({
            projectName: project?.name,
            summary: extraction.summary,
            proposedTask: extraction.proposedTask,
            noteUrl: updatedNote.url,
          }),
          keyboard: reviewKeyboard(
            job.noteId,
            Boolean(extraction.proposedTask),
            updatedNote.url,
          ),
          markdown: true,
        }),
      );
    }
  });
}

export async function processCaptureJob(
  job: CaptureJob,
  deps: ProcessCaptureDeps,
): Promise<void> {
  await Effect.runPromise(processCaptureJobEffect(job, deps));
}

function totalFailure(
  job: CaptureJob,
  deps: ProcessCaptureDeps,
  message: string,
) {
  return Effect.gen(function* () {
    yield* tryNotion(() => deps.notion.trashNote(job.noteId));
    if (job.reviewMessageId) {
      yield* tryTelegram(() =>
        deps.telegram.editMessage({
          chatId: job.chatId,
          messageId: job.reviewMessageId!,
          text: message,
          markdown: false,
        }),
      );
    }
  });
}

function tryNotion<T>(fn: () => Promise<T>) {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) =>
      new IntegrationError({
        service: "notion",
        message: "Notion operation failed",
        cause,
      }),
  });
}

function tryTelegram<T>(fn: () => Promise<T>) {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) =>
      new IntegrationError({
        service: "telegram",
        message: "Telegram operation failed",
        cause,
      }),
  });
}
