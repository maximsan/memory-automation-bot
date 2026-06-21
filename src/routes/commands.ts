import {
  escapeTelegramMarkdown,
  formatActive,
  formatHelp,
} from "@/core/format";
import { matchProject } from "@/core/projectMatcher";
import type { AppConfig } from "@/config";
import type { NotionStore } from "@/integrations/notionStore";

export type CommandResponse = {
  text: string;
  markdown?: boolean;
};

export async function handleCommand(input: {
  command: string;
  args: string;
  notion: NotionStore;
  config: AppConfig;
}): Promise<CommandResponse> {
  switch (input.command) {
    case "help":
    case "start":
      return { text: formatHelp() };

    case "active": {
      const counts = await input.notion.activeCounts();

      return { text: formatActive(counts), markdown: true };
    }

    case "addproject": {
      const projectInput = parseAddProjectArgs(input.args);

      if (!projectInput) {
        return { text: addProjectUsage() };
      }

      const project = await input.notion.createProject(
        projectInput.name,
        projectInput.aliases,
      );
      const aliasLine = projectInput.aliases.length
        ? `\nAliases: ${projectInput.aliases.join(", ")}`
        : "";

      return { text: `Added project: ${project.name}${aliasLine}` };
    }

    case "project": {
      if (!input.args) {
        return {
          text: [
            "Usage: /project <name>",
            "Example: /project cleanup-photos",
            "",
            "To update a project, send a normal message like:",
            "cleanup-photos: deployed to Vercel, next step is testing.",
            "",
            "I will create a review card. Tapping Approve commits the update.",
          ].join("\n"),
        };
      }

      if (input.args.includes(":")) {
        return {
          text: "I cannot update from /project. Send this without the slash so I can create a review card.",
        };
      }

      const projects = await input.notion.listActiveProjects();
      const matched = matchProject(input.args, projects);

      if (matched.kind === "none") {
        return {
          text: "Project not found. Use /active to see current counts or /addproject <name> [| alias, alias] to add it.",
        };
      }

      if (matched.kind === "ambiguous") {
        return {
          text: `Multiple matches: ${matched.projects
            .map((project) => project.name)
            .join(", ")}`,
        };
      }

      const project = matched.project;
      const [notes, tasks] = await Promise.all([
        input.notion.recentApprovedNotes(project.id, input.config.recentNotes),
        input.notion.projectTasks(
          project.id,
          ["Proposed", "Next", "Doing", "Blocked"],
          input.config.maxTasks,
        ),
      ]);

      const lines = [
        `*${escapeTelegramMarkdown(project.name)}*`,
        "",
        "*State:*",
        escapeTelegramMarkdown(project.projectState || "No state yet."),
        "",
        "*Recent notes:*",
        ...(notes.length
          ? notes.map(
            (note) =>
              `\\- ${escapeTelegramMarkdown(note.cleanedSummary || "")}`,
          )
          : ["\\- none"]),
        "",
        "*Tasks:*",
        ...(tasks.length
          ? tasks.map((task) => `\\- ${escapeTelegramMarkdown(task.name)}`)
          : ["\\- none"]),
      ];

      return { text: lines.join("\n"), markdown: true };
    }

    case "clean":
      return {
        text: "Clean requested. I will delete recent temporary messages where Telegram still allows it.",
      };

    default:
      return { text: "Unknown command. Use /help." };
  }
}

function parseAddProjectArgs(
  args: string,
): { name: string; aliases: string[] } | null {
  const [rawName = "", rawAliases = ""] = args.split("|", 2);
  const name = rawName.trim();

  if (!name) {
    return null;
  }

  const aliases = rawAliases
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);

  return { name, aliases };
}

function addProjectUsage(): string {
  return [
    "Usage: /addproject <name>",
    "Optional aliases: /addproject <name> | alias, alias",
  ].join("\n");
}
