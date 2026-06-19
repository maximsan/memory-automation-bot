import { readFile } from "node:fs/promises";
import path from "node:path";

export type PromptSet = {
  extractNote: string;
  updateProjectState: string;
};

export async function loadPrompts(): Promise<PromptSet> {
  const root = process.cwd();
  const [extractNote, updateProjectState] = await Promise.all([
    readFile(path.join(root, "prompts", "extract-note.md"), "utf8"),
    readFile(path.join(root, "prompts", "update-project-state.md"), "utf8"),
  ]);

  return { extractNote, updateProjectState };
}
