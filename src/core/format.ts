import type { TelegramKeyboard } from "./types";

/**
 * Escape user and AI text for Telegram MarkdownV2.
 *
 * Telegram rejects the whole message on malformed Markdown, so all dynamic
 * formatted text must pass through this helper before sending.
 */
export function escapeTelegramMarkdown(value: string): string {
  return value.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export function formatReviewMessage(input: {
  projectName?: string | null;
  summary: string;
  proposedTask?: string | null;
  noteUrl?: string;
}): string {
  const project = input.projectName ?? "not sure, please choose";
  const lines = [
    "*Review*",
    "",
    `*Project:* ${escapeTelegramMarkdown(project)}`,
    "",
    "*Summary:*",
    escapeTelegramMarkdown(input.summary),
  ];

  if (input.proposedTask) {
    lines.push(
      "",
      "*Proposed task:*",
      escapeTelegramMarkdown(input.proposedTask),
    );
  }

  return lines.join("\n");
}

export function reviewKeyboard(
  noteId: string,
  hasTask: boolean,
  noteUrl?: string,
): TelegramKeyboard {
  const rows: TelegramKeyboard = hasTask
    ? [
      [
        { text: "Approve + task", callbackData: `at:${noteId}` },
        { text: "Approve note only", callbackData: `an:${noteId}` },
      ],
      [
        { text: "Wrong project", callbackData: `wp:${noteId}` },
        { text: "Edit", callbackData: `ed:${noteId}` },
        { text: "Remove", callbackData: `rm:${noteId}` },
      ],
    ]
    : [
      [{ text: "Approve", callbackData: `an:${noteId}` }],
      [
        { text: "Wrong project", callbackData: `wp:${noteId}` },
        { text: "Edit", callbackData: `ed:${noteId}` },
        { text: "Remove", callbackData: `rm:${noteId}` },
      ],
    ];

  if (noteUrl) {
    rows.push([{ text: "Open in Notion", url: noteUrl }]);
  }

  return rows;
}

export function formatHelp(): string {
  return [
    "Send me a note, sketchpad photo, or voice note.",
    "",
    "Commands:",
    "/active - show pending reviews and next work",
    "/project <name> - show one project state",
    "/addproject <name> - add a project",
    "/clean - remove temporary chat messages",
    "/help - show this",
  ].join("\n");
}

export function formatActive(input: {
  needsReview: number;
  proposedTasks: number;
  nextTasks: number;
  recentlyUpdatedProjects: number;
}): string {
  return [
    "*Active queue:*",
    `${input.needsReview} notes need review`,
    `${input.proposedTasks} proposed tasks`,
    `${input.nextTasks} next tasks`,
    `${input.recentlyUpdatedProjects} active projects updated this week`,
  ]
    .map(escapeTelegramMarkdownPreservingBold)
    .join("\n");
}

function escapeTelegramMarkdownPreservingBold(value: string): string {
  if (value.startsWith("*") && value.endsWith("*")) {
    return value;
  }

  return escapeTelegramMarkdown(value);
}
