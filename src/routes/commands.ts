import {
  escapeTelegramMarkdown,
  formatActive,
  formatHelp,
} from "@/core/format";
import { matchProject } from "@/core/projectMatcher";
import type { AppConfig } from "@/config";
import type { NotionStore } from "@/integrations/notionStore";

export async function handleCommand(input: {
  command: string;
  args: string;
  notion: NotionStore;
  config: AppConfig;
}): Promise<string> {
  switch (input.command) {
    case "help":
    case "start":
      return formatHelp();

    case "active": {
      const counts = await input.notion.activeCounts();

      return formatActive(counts);
    }

    case "addproject": {
      if (!input.args) {
        return "Usage: /addproject <name>";
      }

      const project = await input.notion.createProject(input.args);

      return `Added project: ${escapeTelegramMarkdown(project.name)}`;
    }

    case "project": {
      if (!input.args) {
        return "Usage: /project <name>";
      }
      const projects = await input.notion.listActiveProjects();
      const matched = matchProject(input.args, projects);

      if (matched.kind === "none") {
        return "Project not found.";
      }

      if (matched.kind === "ambiguous") {
        return `Multiple matches: ${matched.projects
          .map((project) => project.name)
          .join(", ")}`;
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
            (note) => `- ${escapeTelegramMarkdown(note.cleanedSummary || "")}`,
          )
          : ["- none"]),
        "",
        "*Tasks:*",
        ...(tasks.length
          ? tasks.map((task) => `- ${escapeTelegramMarkdown(task.name)}`)
          : ["- none"]),
      ];

      return lines.join("\n");
    }

    case "clean":
      return "Clean requested. I will delete recent temporary messages where Telegram still allows it.";

    default:
      return "Unknown command. Use /help.";
  }
}
