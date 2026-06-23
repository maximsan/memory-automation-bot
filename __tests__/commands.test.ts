import { describe, expect, it, vi } from "vitest";
import {
  helpActionCommands,
  telegramMenuCommands,
} from "@/core/commandDefinitions";
import { formatHelp } from "@/core/format";
import { handleCommand } from "@/routes/commands";
import type { AppConfig } from "@/config";
import type { NotionStore } from "@/integrations/notionStore";
import type { ProjectRecord } from "@/core/types";

const config = {
  recentNotes: 3,
  maxTasks: 5,
} as AppConfig;

function createNotion(overrides: Partial<NotionStore> = {}): NotionStore {
  return {
    createProject: vi.fn(),
    listActiveProjects: vi.fn(),
    recentApprovedNotes: vi.fn(),
    projectTasks: vi.fn(),
    ...overrides,
  } as unknown as NotionStore;
}

describe("handleCommand", () => {
  it("renders help and menu commands from the same action definitions", () => {
    const help = formatHelp();

    for (const command of helpActionCommands) {
      expect(help).toContain(`/${command.usage} - ${command.description}`);
    }

    expect(telegramMenuCommands()).toEqual(
      helpActionCommands.map(({ command, description }) => ({
        command,
        description,
      })),
    );
  });

  it("returns plain add-project text without Markdown escape slashes", async () => {
    const createProject = vi.fn().mockResolvedValue({
      id: "project-1",
      name: "super-dooper",
      aliases: [],
      status: "Active",
    });
    const notion = createNotion({
      createProject,
    });

    const response = await handleCommand({
      command: "addproject",
      args: "super-dooper",
      notion,
      config,
    });

    expect(response).toEqual({ text: "Added project: super-dooper" });
    expect(createProject).toHaveBeenCalledWith("super-dooper", []);
  });

  it("adds a project with aliases from pipe syntax", async () => {
    const createProject = vi.fn().mockResolvedValue({
      id: "project-1",
      name: "n8n-automation",
      aliases: [
        "project memory bot",
        "memory bot",
        "telegram notion automation",
      ],
      status: "Active",
    });
    const notion = createNotion({
      createProject,
    });

    const response = await handleCommand({
      command: "addproject",
      args: "n8n-automation | project memory bot, memory bot, telegram notion automation",
      notion,
      config,
    });

    expect(createProject).toHaveBeenCalledWith("n8n-automation", [
      "project memory bot",
      "memory bot",
      "telegram notion automation",
    ]);
    expect(response).toEqual({
      text: [
        "Added project: n8n-automation",
        "Aliases: project memory bot, memory bot, telegram notion automation",
      ].join("\n"),
    });
  });

  it("shows add-project alias syntax when name is missing", async () => {
    const createProject = vi.fn();
    const notion = createNotion({ createProject });

    const response = await handleCommand({
      command: "addproject",
      args: "",
      notion,
      config,
    });

    expect(response).toEqual({
      text: [
        "Usage: /addproject <name>",
        "Optional aliases: /addproject <name> | alias, alias",
      ].join("\n"),
    });
    expect(createProject).not.toHaveBeenCalled();
  });

  it("escapes project view empty bullets for MarkdownV2", async () => {
    const project: ProjectRecord = {
      id: "project-1",
      name: "cleanup-photos",
      aliases: [],
      status: "Active",
    };
    const notion = createNotion({
      listActiveProjects: vi.fn().mockResolvedValue([project]),
      recentApprovedNotes: vi.fn().mockResolvedValue([]),
      projectTasks: vi.fn().mockResolvedValue([]),
    });

    const response = await handleCommand({
      command: "project",
      args: "cleanup-photos",
      notion,
      config,
    });

    expect(response.markdown).toBe(true);
    expect(response.text).toContain("\\- none");
    expect(response.text).not.toContain("\n- none");
  });

  it("explains that slash project messages do not update state", async () => {
    const listActiveProjects = vi.fn();
    const notion = createNotion({ listActiveProjects });

    const response = await handleCommand({
      command: "project",
      args: "cleanup: deployed to Vercel",
      notion,
      config,
    });

    expect(response).toEqual({
      text: "I cannot update from /project. Send this without the slash so I can create a review card.",
    });
    expect(listActiveProjects).not.toHaveBeenCalled();
  });

  it("shows project usage when the menu sends bare project command", async () => {
    const notion = createNotion();

    const response = await handleCommand({
      command: "project",
      args: "",
      notion,
      config,
    });

    expect(response.text).toContain("Usage: /project <name>");
    expect(response.text).toContain("Example: /project cleanup-photos");
  });
});
