import { Client } from "@notionhq/client";
import type { AppConfig } from "@/config";
import type {
  CaptureJob,
  NoteRecord,
  ProjectRecord,
  ProjectStatus,
  ReviewStatus,
  SourceType,
  TaskRecord,
  TaskStatus,
} from "@/core/types";
import { titleForSource } from "@/core/telegram";

export type NotionStore = ReturnType<typeof createNotionStore>;

type DatabaseIds = {
  projects: string;
  notes: string;
  tasks: string;
};

export function createNotionStore(config: AppConfig) {
  const notion = new Client({ auth: config.notionToken });
  let databaseIdsPromise: Promise<DatabaseIds> | undefined;

  async function databaseIds(): Promise<DatabaseIds> {
    // The setup script creates the databases as children of one parent page.
    // Runtime only needs the parent id, so database ids are discovered once and
    // cached for the life of the serverless invocation.
    databaseIdsPromise ??= findDatabaseIds(notion, config.notionParentPageId);

    return databaseIdsPromise;
  }

  return {
    async getNote(noteId: string): Promise<NoteRecord | null> {
      try {
        const page = await notion.pages.retrieve({ page_id: noteId });

        return pageToNote(page as any);
      } catch {
        return null;
      }
    },

    async createNoteFromCapture(
      job: Omit<CaptureJob, "noteId" | "reviewMessageId">,
    ): Promise<NoteRecord> {
      const ids = await databaseIds();
      const page = await notion.pages.create({
        parent: { database_id: ids.notes },
        properties: {
          Name: titleProperty(titleForSource(job.sourceType, job.messageId)),
          "Review Status": selectProperty("Needs Review"),
          "Source Type": selectProperty(job.sourceType),
          "Original Text": richTextProperty(job.text ?? ""),
          "User Hint": richTextProperty(job.userHint ?? ""),
          "Telegram Chat ID": richTextProperty(job.chatId),
          "Telegram Message ID": richTextProperty(job.messageId),
          "Created At": dateProperty(new Date()),
        },
      });

      return pageToNote(page as any);
    },

    async findNoteByTelegramMessage(
      chatId: string,
      messageId: string,
    ): Promise<NoteRecord | null> {
      const ids = await databaseIds();
      const result = await notion.databases.query({
        database_id: ids.notes,
        page_size: 1,
        filter: {
          and: [
            { property: "Telegram Chat ID", rich_text: { equals: chatId } },
            {
              property: "Telegram Message ID",
              rich_text: { equals: messageId },
            },
          ],
        },
      });

      return result.results[0] ? pageToNote(result.results[0] as any) : null;
    },

    async findNoteByReviewMessage(
      chatId: string,
      reviewMessageId: string,
    ): Promise<NoteRecord | null> {
      const ids = await databaseIds();
      const result = await notion.databases.query({
        database_id: ids.notes,
        page_size: 1,
        filter: {
          and: [
            { property: "Telegram Chat ID", rich_text: { equals: chatId } },
            {
              property: "Telegram Review Message ID",
              rich_text: { equals: reviewMessageId },
            },
            { property: "Review Status", select: { equals: "Needs Review" } },
          ],
        },
      });

      return result.results[0] ? pageToNote(result.results[0] as any) : null;
    },

    async setReviewMessageId(
      noteId: string,
      reviewMessageId: string,
    ): Promise<void> {
      await notion.pages.update({
        page_id: noteId,
        properties: {
          "Telegram Review Message ID": richTextProperty(reviewMessageId),
        },
      });
    },

    async updateNoteExtraction(input: {
      noteId: string;
      projectId?: string;
      summary: string;
      proposedTask?: string;
    }): Promise<NoteRecord> {
      const page = await notion.pages.update({
        page_id: input.noteId,
        properties: {
          ...(input.projectId
            ? { Project: { relation: [{ id: input.projectId }] } }
            : {}),
          "Cleaned Summary": richTextProperty(input.summary),
          "Proposed Task": richTextProperty(input.proposedTask ?? ""),
        },
      });

      return pageToNote(page as any);
    },

    async updateNoteSummary(
      noteId: string,
      summary: string,
    ): Promise<NoteRecord> {
      const page = await notion.pages.update({
        page_id: noteId,
        properties: {
          "Cleaned Summary": richTextProperty(summary),
        },
      });

      return pageToNote(page as any);
    },

    async setNoteProject(
      noteId: string,
      projectId: string,
    ): Promise<NoteRecord> {
      const page = await notion.pages.update({
        page_id: noteId,
        properties: {
          Project: { relation: [{ id: projectId }] },
        },
      });

      return pageToNote(page as any);
    },

    async approveNote(noteId: string): Promise<NoteRecord> {
      const page = await notion.pages.update({
        page_id: noteId,
        properties: {
          "Review Status": selectProperty("Approved"),
        },
      });

      return pageToNote(page as any);
    },

    async trashNote(noteId: string): Promise<void> {
      await notion.pages.update({ page_id: noteId, in_trash: true });
    },

    async listActiveProjects(): Promise<ProjectRecord[]> {
      const ids = await databaseIds();
      const result = await notion.databases.query({
        database_id: ids.projects,
        page_size: 100,
        filter: { property: "Status", select: { equals: "Active" } },
        sorts: [{ property: "Name", direction: "ascending" }],
      });

      return result.results.map((page) => pageToProject(page as any));
    },

    async createProject(name: string): Promise<ProjectRecord> {
      const ids = await databaseIds();
      const page = await notion.pages.create({
        parent: { database_id: ids.projects },
        properties: {
          Name: titleProperty(name),
          Status: selectProperty("Active"),
          Aliases: richTextProperty(""),
          "Project State": richTextProperty(""),
          "Last Updated": dateProperty(new Date()),
        },
      });

      return pageToProject(page as any);
    },

    async getProject(projectId: string): Promise<ProjectRecord> {
      const page = await notion.pages.retrieve({ page_id: projectId });

      return pageToProject(page as any);
    },

    async updateProjectState(
      projectId: string,
      projectState: string,
    ): Promise<ProjectRecord> {
      const page = await notion.pages.update({
        page_id: projectId,
        properties: {
          "Project State": richTextProperty(projectState),
          "Last Updated": dateProperty(new Date()),
        },
      });

      return pageToProject(page as any);
    },

    async createTask(input: {
      title: string;
      projectId: string;
      noteId: string;
    }): Promise<TaskRecord> {
      const ids = await databaseIds();
      const page = await notion.pages.create({
        parent: { database_id: ids.tasks },
        properties: {
          Name: titleProperty(input.title),
          Project: { relation: [{ id: input.projectId }] },
          Status: selectProperty("Proposed"),
          "Source Note": { relation: [{ id: input.noteId }] },
          "Created At": dateProperty(new Date()),
        },
      });

      return pageToTask(page as any);
    },

    async recentApprovedNotes(
      projectId: string,
      limit: number,
    ): Promise<NoteRecord[]> {
      const ids = await databaseIds();
      const result = await notion.databases.query({
        database_id: ids.notes,
        page_size: limit,
        filter: {
          and: [
            { property: "Project", relation: { contains: projectId } },
            { property: "Review Status", select: { equals: "Approved" } },
          ],
        },
        sorts: [{ property: "Created At", direction: "descending" }],
      });

      return result.results.map((page) => pageToNote(page as any));
    },

    async projectTasks(
      projectId: string,
      statuses: TaskStatus[],
      limit: number,
    ): Promise<TaskRecord[]> {
      const ids = await databaseIds();
      const result = await notion.databases.query({
        database_id: ids.tasks,
        page_size: limit,
        filter: {
          and: [
            { property: "Project", relation: { contains: projectId } },
            {
              or: statuses.map((status) => ({
                property: "Status",
                select: { equals: status },
              })),
            },
          ],
        },
      });

      return result.results.map((page) => pageToTask(page as any));
    },

    async activeCounts(): Promise<{
      needsReview: number;
      proposedTasks: number;
      nextTasks: number;
      recentlyUpdatedProjects: number;
    }> {
      const ids = await databaseIds();
      const [
        needsReview,
        proposedTasks,
        nextTasks,
        recentProjects,
      ] = await Promise.all([
        notion.databases.query({
          database_id: ids.notes,
          page_size: 100,
          filter: {
            property: "Review Status",
            select: { equals: "Needs Review" },
          },
        }),
        notion.databases.query({
          database_id: ids.tasks,
          page_size: 100,
          filter: { property: "Status", select: { equals: "Proposed" } },
        }),
        notion.databases.query({
          database_id: ids.tasks,
          page_size: 100,
          filter: { property: "Status", select: { equals: "Next" } },
        }),
        notion.databases.query({
          database_id: ids.projects,
          page_size: 100,
          filter: {
            and: [
              { property: "Status", select: { equals: "Active" } },
              {
                property: "Last Updated",
                date: { on_or_after: weekAgoIsoDate() },
              },
            ],
          },
        }),
      ]);

      return {
        needsReview: needsReview.results.length,
        proposedTasks: proposedTasks.results.length,
        nextTasks: nextTasks.results.length,
        recentlyUpdatedProjects: recentProjects.results.length,
      };
    },

    async recentNotesForCleaning(limit = 20): Promise<NoteRecord[]> {
      const ids = await databaseIds();
      const result = await notion.databases.query({
        database_id: ids.notes,
        page_size: limit,
        sorts: [{ property: "Created At", direction: "descending" }],
      });

      return result.results.map((page) => pageToNote(page as any));
    },
  };
}

async function findDatabaseIds(
  notion: Client,
  parentPageId: string,
): Promise<DatabaseIds> {
  // Keep env config small by resolving database ids from stable child database
  // titles under NOTION_PARENT_PAGE_ID.
  const children = await notion.blocks.children.list({
    block_id: parentPageId,
    page_size: 100,
  });
  const entries = children.results
    .map((block: any) =>
      block.type === "child_database"
        ? { id: block.id, title: block.child_database.title }
        : null,
    )
    .filter(Boolean) as Array<{ id: string; title: string }>;

  const projects = entries.find((entry) => entry.title === "Projects")?.id;
  const notes = entries.find((entry) => entry.title === "Notes")?.id;
  const tasks = entries.find((entry) => entry.title === "Tasks")?.id;

  if (!projects || !notes || !tasks) {
    throw new Error(
      "Could not find Projects, Notes, and Tasks databases under the Notion parent page",
    );
  }

  return { projects, notes, tasks };
}

function pageToProject(page: any): ProjectRecord {
  const props = page.properties;

  // Notion SDK page objects are broad unions. These mappers keep unsafe property
  // reads contained at the API boundary and expose small domain records inside.
  return {
    id: page.id,
    name: titleValue(props.Name),
    aliases: richTextValue(props.Aliases)
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean),
    status: (selectValue(props.Status) || "Active") as ProjectStatus,
    projectState: richTextValue(props["Project State"]),
    url: page.url,
  };
}

function pageToNote(page: any): NoteRecord {
  const props = page.properties;

  return {
    id: page.id,
    projectId: props.Project?.relation?.[0]?.id,
    reviewStatus: (selectValue(props["Review Status"])
      || "Needs Review") as ReviewStatus,
    sourceType: (selectValue(props["Source Type"]) || "text") as SourceType,
    originalText: richTextValue(props["Original Text"]),
    cleanedSummary: richTextValue(props["Cleaned Summary"]),
    proposedTask: richTextValue(props["Proposed Task"]),
    userHint: richTextValue(props["User Hint"]),
    telegramChatId: richTextValue(props["Telegram Chat ID"]),
    telegramMessageId: richTextValue(props["Telegram Message ID"]),
    telegramReviewMessageId: richTextValue(props["Telegram Review Message ID"]),
    url: page.url,
  };
}

function pageToTask(page: any): TaskRecord {
  const props = page.properties;

  return {
    id: page.id,
    name: titleValue(props.Name),
    projectId: props.Project?.relation?.[0]?.id,
    status: (selectValue(props.Status) || "Proposed") as TaskStatus,
    url: page.url,
  };
}

function titleProperty(content: string) {
  return { title: [{ text: { content: truncate(content, 1900) } }] };
}

function richTextProperty(content: string) {
  return { rich_text: [{ text: { content: truncate(content, 1900) } }] };
}

function selectProperty(name: string) {
  return { select: { name } };
}

function dateProperty(date: Date) {
  return { date: { start: date.toISOString() } };
}

function titleValue(property: any): string {
  return property?.title?.map((item: any) => item.plain_text).join("") ?? "";
}

function richTextValue(property: any): string {
  return (
    property?.rich_text?.map((item: any) => item.plain_text).join("") ?? ""
  );
}

function selectValue(property: any): string | undefined {
  return property?.select?.name;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function weekAgoIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);

  return date.toISOString();
}
