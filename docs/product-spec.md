# Project Memory Bot Product Spec

Project Memory Bot is a private Telegram-to-Notion assistant for remembering coding project context. The goal is simple: capture messy thoughts quickly, review them in Telegram, and keep Notion updated with what happened last and what to do next.

Rule number one: lesser and simpler is best. If a feature does not directly help restore project context, it waits.

## Product Contract

The shared contract applies to both implementations:

- Telegram is the capture and lightweight review surface.
- Notion is the durable source of truth and reading surface.
- OpenAI extracts text, structure, project guess, and at most one proposed task.
- Every processed capture requires review in v1. There is no auto-approval.
- Original media is temporary. Text, OCR, transcripts, summaries, and decisions are durable.
- Project state is latest-only and short. History lives in notes.

## Telegram UX

Supported inputs:

- normal text messages
- forwarded messages
- sketchpad photos
- voice notes
- optional captions as user hints
- links as plain text notes, without page fetching

Commands:

- `/active` shows counts first: notes needing review, proposed tasks, next tasks, recently updated projects.
- `/project <name>` shows one project state, three recent notes, and up to five tasks.
- `/addproject <name>` creates an active project.
- `/clean` deletes temporary Telegram messages where Telegram still allows it.
- `/help` shows a short command list.

Review message without a task:

```text
Review

Project: cleanup-photos

Summary:
Fixed the pnpm CI setup issue. Next step is visual tests.
```

Buttons:

- `Approve`
- `Wrong project`
- `Edit`
- `Remove`

Review message with a task:

```text
Review

Project: cleanup-photos

Summary:
Fixed the pnpm CI setup issue.

Proposed task:
Check visual test failures.
```

Buttons:

- `Approve + task`
- `Approve note only`
- `Wrong project`
- `Edit`
- `Remove`

`Edit` changes only the summary. `Wrong project` opens a project picker. `Remove` trashes the pending Notion note and cleans up Telegram where possible.

## Notion Model

Use one parent page named `Project Memory Bot`. Setup creates or reuses three databases under it.

### Projects

Fields:

- `Name` title
- `Aliases` text
- `Status` select: `Active`, `Paused`, `Done`, `Archived`
- `Project State` text
- `Last Updated` date

### Notes

Fields:

- `Name` title
- `Project` relation to Projects
- `Review Status` select: `Needs Review`, `Approved`, `Error`
- `Source Type` select: `text`, `photo`, `voice`
- `Original Text` text
- `Cleaned Summary` text
- `Proposed Task` text
- `User Hint` text
- `Telegram Chat ID` text
- `Telegram Message ID` text
- `Telegram Review Message ID` text
- `Created At` date

### Tasks

Fields:

- `Name` title
- `Project` relation to Projects
- `Status` select: `Proposed`, `Next`, `Doing`, `Blocked`, `Done`
- `Source Note` relation to Notes
- `Created At` date

## AI Contract

AI extraction returns JSON only:

```json
{
  "project": "string | null",
  "summary": "string",
  "proposedTask": "string | null",
  "needsReviewReason": "string | null"
}
```

Constraints:

- one capture can produce at most one proposed task
- project may be null
- no confidence score is shown to the user
- total processing failure stays in Telegram; partial extraction creates a `Needs Review` note

## Reminder

Weekly reminder is sent by Telegram once per week. It contains counts only:

```text
Weekly check-in:
2 notes need review
4 proposed tasks
3 active projects updated this week

Use /active
```
