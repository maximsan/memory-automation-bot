import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";

type DatabaseSummary = {
  id: string;
  title: string;
};

type SeedProject = {
  name: string;
  aliases?: string[];
};

const PROJECT_STATUSES = ["Active", "Paused", "Done", "Archived"];
const REVIEW_STATUSES = ["Needs Review", "Approved", "Error"];
const SOURCE_TYPES = ["text", "photo", "voice"];
const TASK_STATUSES = ["Proposed", "Next", "Doing", "Blocked", "Done"];

/**
 * Creates the minimal Notion schema under the user-provided parent page.
 *
 * This setup is conservative by design: it creates missing databases, reuses
 * compatible ones, and fails on conflicting schemas instead of editing existing
 * user-owned databases automatically.
 */
export async function setupNotion(input: {
  notionToken: string;
  parentPageId: string;
  projectsPath?: string;
}): Promise<void> {
  const notion = new Client({ auth: input.notionToken });
  const existing = await listChildDatabases(notion, input.parentPageId);

  const projectsId = (await ensureDatabase({
    notion,
    parentPageId: input.parentPageId,
    existing,
    title: "Projects",
    properties: projectProperties()
  })) ?? "";

  const notesId = (await ensureDatabase({
    notion,
    parentPageId: input.parentPageId,
    existing: await listChildDatabases(notion, input.parentPageId),
    title: "Notes",
    properties: noteProperties(projectsId)
  })) ?? "";

  await ensureDatabase({
    notion,
    parentPageId: input.parentPageId,
    existing: await listChildDatabases(notion, input.parentPageId),
    title: "Tasks",
    properties: taskProperties(projectsId, notesId)
  });

  await seedProjects(notion, projectsId, input.projectsPath);
}

async function ensureDatabase(input: {
  notion: Client;
  parentPageId: string;
  existing: DatabaseSummary[];
  title: string;
  properties: Record<string, unknown>;
}): Promise<string> {
  const found = input.existing.find((database) => database.title === input.title);

  if (!found) {
    const created = await input.notion.databases.create({
      parent: { type: "page_id", page_id: input.parentPageId },
      title: [{ type: "text", text: { content: input.title } }],
      properties: input.properties as any
    });
    console.log(`Created ${input.title} database: ${created.id}`);

    return created.id;
  }

  const database = (await input.notion.databases.retrieve({
    database_id: found.id
  })) as any;
  assertCompatibleSchema(input.title, database.properties, input.properties);
  console.log(`Reused ${input.title} database: ${found.id}`);

  return found.id;
}

async function listChildDatabases(
  notion: Client,
  parentPageId: string
): Promise<DatabaseSummary[]> {
  const children = await notion.blocks.children.list({
    block_id: parentPageId,
    page_size: 100
  });

  return children.results
    .map((block: any) =>
      block.type === "child_database"
        ? { id: block.id, title: block.child_database.title }
        : null
    )
    .filter((database): database is DatabaseSummary => Boolean(database));
}

function assertCompatibleSchema(
  title: string,
  actual: Record<string, any>,
  expected: Record<string, any>
): void {
  // This intentionally checks only required property names and types. Option
  // lists may grow over time, but a type mismatch would break runtime writes.
  for (const [name, expectedShape] of Object.entries(expected)) {
    const actualProperty = actual[name];

    if (!actualProperty) {
      throw new Error(`${title} database is missing property: ${name}`);
    }
    const expectedType = Object.keys(expectedShape as Record<string, unknown>)[0];

    if (actualProperty.type !== expectedType) {
      throw new Error(
        `${title}.${name} should be ${expectedType}, got ${actualProperty.type}`
      );
    }
  }
}

function projectProperties() {
  return {
    Name: { title: {} },
    Aliases: { rich_text: {} },
    Status: { select: { options: selectOptions(PROJECT_STATUSES) } },
    "Project State": { rich_text: {} },
    "Last Updated": { date: {} }
  };
}

function noteProperties(projectsId: string) {
  return {
    Name: { title: {} },
    Project: { relation: { database_id: projectsId, type: "single_property", single_property: {} } },
    "Review Status": { select: { options: selectOptions(REVIEW_STATUSES) } },
    "Source Type": { select: { options: selectOptions(SOURCE_TYPES) } },
    "Original Text": { rich_text: {} },
    "Cleaned Summary": { rich_text: {} },
    "Proposed Task": { rich_text: {} },
    "User Hint": { rich_text: {} },
    "Telegram Chat ID": { rich_text: {} },
    "Telegram Message ID": { rich_text: {} },
    "Telegram Review Message ID": { rich_text: {} },
    "Created At": { date: {} }
  };
}

function taskProperties(projectsId: string, notesId: string) {
  return {
    Name: { title: {} },
    Project: { relation: { database_id: projectsId, type: "single_property", single_property: {} } },
    Status: { select: { options: selectOptions(TASK_STATUSES) } },
    "Source Note": { relation: { database_id: notesId, type: "single_property", single_property: {} } },
    "Created At": { date: {} }
  };
}

function selectOptions(names: string[]) {
  return names.map((name) => ({ name, color: "default" }));
}

async function seedProjects(
  notion: Client,
  projectsId: string,
  projectsPath = path.join(process.cwd(), "config", "projects.json")
): Promise<void> {
  if (!existsSync(projectsPath)) {
    return;
  }
  const seeds = JSON.parse(await readFile(projectsPath, "utf8")) as SeedProject[];

  for (const seed of seeds) {
    // Project seeding is idempotent by title so local setup can be rerun safely.
    const existing = await notion.databases.query({
      database_id: projectsId,
      page_size: 1,
      filter: { property: "Name", title: { equals: seed.name } }
    });

    if (existing.results.length > 0) {
      continue;
    }

    await notion.pages.create({
      parent: { database_id: projectsId },
      properties: {
        Name: { title: [{ text: { content: seed.name } }] },
        Aliases: {
          rich_text: [{ text: { content: (seed.aliases ?? []).join(", ") } }]
        },
        Status: { select: { name: "Active" } },
        "Project State": { rich_text: [] },
        "Last Updated": { date: { start: new Date().toISOString() } }
      }
    });
    console.log(`Seeded project: ${seed.name}`);
  }
}
