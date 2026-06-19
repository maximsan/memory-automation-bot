# Mission: Project Memory Bot Ownership

## Why

You want to own a simple private automation that restores coding project context from Telegram captures into Notion. The goal is not to learn every tool deeply; the goal is to confidently setup, debug, and evolve this bot without turning it into a large platform.

## Success looks like

- You can setup the bot from a clean checkout and explain which external account owns each secret.
- You can trace one Telegram capture from webhook to Notion note, queue processing, review, approval, task creation, and project state update.
- You can choose the right file to edit for common changes: commands, review buttons, prompts, Notion schema, project matching, or deployment config.
- You can run the correct local checks before deploying a change.

## Constraints

- Keep Version A personal and simple.
- Optimize for coding projects first.
- Use Notion as the durable state and reading surface.
- Prefer small, testable changes over broad rewrites.
- Do not require always-running local infrastructure.

## Out of scope

- Building the standalone n8n Version B implementation now.
- Adding priorities, due dates, task editing, multi-user auth, dashboards, or a web UI before the core capture-review loop is reliable.
