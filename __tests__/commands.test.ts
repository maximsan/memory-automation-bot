import { describe, expect, it, vi } from "vitest";
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
  it("returns plain add-project text without Markdown escape slashes", async () => {
    const notion = createNotion({
      createProject: vi.fn().mockResolvedValue({
        id: "project-1",
        name: "super-dooper",
        aliases: [],
        status: "Active",
      }),
    });

    const response = await handleCommand({
      command: "addproject",
      args: "super-dooper",
      notion,
      config,
    });

    expect(response).toEqual({ text: "Added project: super-dooper" });
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
});
