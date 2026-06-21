import { describe, expect, it } from "vitest";
import { matchProject } from "@/core/projectMatcher";
import type { ProjectRecord } from "@/core/types";

const projects: ProjectRecord[] = [
  {
    id: "1",
    name: "cleanup-photos",
    aliases: ["photo cleanup", "dedup", "memory bot"],
    status: "Active"
  },
  {
    id: "2",
    name: "maximsan",
    aliases: ["personal site"],
    status: "Active"
  }
];

describe("matchProject", () => {
  it("matches aliases", () => {
    const matched = matchProject("dedup", projects);
    expect(matched.kind).toBe("matched");

    if (matched.kind === "matched") {
      expect(matched.project.id).toBe("1");
    }
  });

  it("matches alias phrases", () => {
    const matched = matchProject("memory bot", projects);
    expect(matched.kind).toBe("matched");

    if (matched.kind === "matched") {
      expect(matched.project.id).toBe("1");
    }
  });

  it("returns none when there is no query", () => {
    expect(matchProject(null, projects)).toEqual({ kind: "none" });
  });
});
