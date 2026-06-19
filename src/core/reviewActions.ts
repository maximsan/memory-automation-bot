import {
  escapeTelegramMarkdown,
  formatReviewMessage,
  reviewKeyboard,
} from "./format";
import { matchProject } from "./projectMatcher";
import type { NoteRecord, ProjectRecord, TelegramKeyboard } from "./types";

export type ReviewDeps = {
  notion: {
    getNote(noteId: string): Promise<NoteRecord | null>;
    approveNote(noteId: string): Promise<NoteRecord>;
    trashNote(noteId: string): Promise<void>;
    listActiveProjects(): Promise<ProjectRecord[]>;
    getProject(projectId: string): Promise<ProjectRecord>;
    setNoteProject(noteId: string, projectId: string): Promise<NoteRecord>;
    updateNoteSummary(noteId: string, summary: string): Promise<NoteRecord>;
    updateProjectState(
      projectId: string,
      projectState: string,
    ): Promise<ProjectRecord>;
    createTask(input: {
      title: string;
      projectId: string;
      noteId: string;
    }): Promise<unknown>;
    recentApprovedNotes(
      projectId: string,
      limit: number,
    ): Promise<NoteRecord[]>;
    projectTasks(
      projectId: string,
      statuses: Array<"Proposed" | "Next" | "Doing" | "Blocked">,
      limit: number,
    ): Promise<Array<{ name: string }>>;
  };
  openai: {
    updateProjectState(input: {
      prompt: string;
      existingState?: string;
      newSummary: string;
      recentSummaries: string[];
      openTasks: string[];
    }): Promise<string>;
  };
  prompts: {
    updateProjectState: string;
  };
  recentNotes: number;
  maxTasks: number;
};

export async function approveReviewedNote(
  noteId: string,
  createTask: boolean,
  deps: ReviewDeps,
): Promise<{ note: NoteRecord; project: ProjectRecord; taskCreated: boolean }> {
  const note = await deps.notion.getNote(noteId);

  if (!note) {
    throw new Error("Note not found");
  }

  if (!note.projectId) {
    throw new Error("Choose a project before approving");
  }

  if (!note.cleanedSummary) {
    throw new Error("Note has no summary to approve");
  }

  const project = await deps.notion.getProject(note.projectId);
  const recentNotes = await deps.notion.recentApprovedNotes(
    note.projectId,
    deps.recentNotes,
  );
  const openTasks = await deps.notion.projectTasks(
    note.projectId,
    ["Proposed", "Next", "Doing", "Blocked"],
    deps.maxTasks,
  );

  let taskCreated = false;
  if (createTask && note.proposedTask) {
    await deps.notion.createTask({
      title: note.proposedTask,
      projectId: note.projectId,
      noteId,
    });
    taskCreated = true;
  }

  const projectState = await deps.openai.updateProjectState({
    prompt: deps.prompts.updateProjectState,
    existingState: project.projectState,
    newSummary: note.cleanedSummary,
    recentSummaries: recentNotes
      .map((recentNote) => recentNote.cleanedSummary)
      .filter(Boolean) as string[],
    openTasks: openTasks.map((task) => task.name),
  });

  const [approvedNote, updatedProject] = await Promise.all([
    deps.notion.approveNote(noteId),
    deps.notion.updateProjectState(note.projectId, projectState),
  ]);

  return { note: approvedNote, project: updatedProject, taskCreated };
}

export async function buildProjectPicker(
  noteId: string,
  deps: Pick<ReviewDeps, "notion">,
): Promise<{ text: string; keyboard: TelegramKeyboard }> {
  const projects = await deps.notion.listActiveProjects();

  return {
    text: "*Choose project:*",
    keyboard: projects
      .slice(0, 10)
      .map((project, index) => [
        { text: project.name, callbackData: `sp:${noteId}:${index}` },
      ]),
  };
}

export async function setProjectByPickerIndex(
  noteId: string,
  index: number,
  deps: Pick<ReviewDeps, "notion">,
): Promise<{ note: NoteRecord; project?: ProjectRecord }> {
  const projects = await deps.notion.listActiveProjects();
  const project = projects[index];

  if (!project) {
    throw new Error("Project choice is no longer available");
  }

  const note = await deps.notion.setNoteProject(noteId, project.id);

  return { note, project };
}

export function savedMessage(
  project: ProjectRecord,
  taskCreated: boolean,
): string {
  const taskLine = taskCreated ? "\nTask proposed\\." : "";

  return `Saved to ${escapeTelegramMarkdown(project.name)}\\.${taskLine}`;
}

export function renderNoteReview(note: NoteRecord, project?: ProjectRecord) {
  const summary = note.cleanedSummary || "(empty summary)";
  const proposedTask = note.proposedTask || null;

  return {
    text: formatReviewMessage({
      projectName: project?.name ?? null,
      summary,
      proposedTask,
      noteUrl: note.url,
    }),
    keyboard: reviewKeyboard(note.id, Boolean(proposedTask), note.url),
  };
}

export async function chooseProjectFromExtraction(
  projectName: string | null | undefined,
  projects: ProjectRecord[],
): Promise<ProjectRecord | undefined> {
  const matched = matchProject(projectName, projects);

  return matched.kind === "matched" ? matched.project : undefined;
}
