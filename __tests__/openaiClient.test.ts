import { describe, expect, it } from "vitest";
import { formatKnownProjects } from "@/integrations/openaiClient";
import type { ProjectRecord } from "@/core/types";

describe("formatKnownProjects", () => {
  it("returns none when there are no known projects", () => {
    expect(formatKnownProjects([])).toBe("none");
  });

  it("includes aliases in the known-project context", () => {
    const projects: ProjectRecord[] = [
      {
        id: "project-1",
        name: "n8n-automation",
        aliases: [
          "project memory bot",
          "memory bot",
          "telegram notion automation",
        ],
        status: "Active",
      },
      {
        id: "project-2",
        name: "maximsan",
        aliases: [],
        status: "Active",
      },
    ];

    expect(formatKnownProjects(projects)).toBe(
      "n8n-automation (aliases: project memory bot, memory bot, telegram notion automation), maximsan",
    );
  });
});
