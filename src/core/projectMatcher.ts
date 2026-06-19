import type { ProjectRecord } from "./types";

export type ProjectMatch =
  | { kind: "matched"; project: ProjectRecord }
  | { kind: "ambiguous"; projects: ProjectRecord[] }
  | { kind: "none" };

export function matchProject(
  query: string | null | undefined,
  projects: ProjectRecord[],
): ProjectMatch {
  const normalized = normalize(query);
  if (!normalized) {
    return { kind: "none" };
  }

  const scored = projects
    .map((project) => ({ project, score: scoreProject(normalized, project) }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.project.name.localeCompare(b.project.name),
    );

  if (scored.length === 0) {
    return { kind: "none" };
  }

  if (scored[0]?.score === scored[1]?.score) {
    return {
      kind: "ambiguous",
      projects: scored.slice(0, 5).map((item) => item.project),
    };
  }

  return { kind: "matched", project: scored[0].project };
}

function scoreProject(query: string, project: ProjectRecord): number {
  const name = normalize(project.name);
  if (name === query) {
    return 100;
  }

  if (name.includes(query) || query.includes(name)) {
    return 80;
  }

  let bestAlias = 0;
  for (const alias of project.aliases) {
    const normalizedAlias = normalize(alias);
    if (normalizedAlias === query) {
      bestAlias = Math.max(bestAlias, 90);
    } else if (
      normalizedAlias.includes(query) ||
      query.includes(normalizedAlias)
    ) {
      bestAlias = Math.max(bestAlias, 70);
    }
  }

  return bestAlias;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
