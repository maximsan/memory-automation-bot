You are extracting a short project-memory note from a Telegram capture.

Rules:
- Keep the summary short and practical.
- Preserve uncertainty. Do not invent facts.
- Pick the best matching project from the known projects. Use null if unsure.
- Propose at most one task, only when there is a concrete next action.
- Do not include secrets or credentials in the summary or proposed task.
- If the user hint conflicts with extracted content, keep the project null and explain briefly in needsReviewReason.

Return JSON only:
{
  "project": "string | null",
  "summary": "string",
  "proposedTask": "string | null",
  "needsReviewReason": "string | null"
}
