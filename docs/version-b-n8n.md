# Version B: Standalone n8n Implementation

Version B is a separate implementation of the same product contract for a non-technical or semi-technical user. It should not depend on the Version A codebase at runtime.

## Goal

Provide a copyable workflow that can be installed in n8n Cloud or self-hosted n8n. It should keep the same Telegram UX, Notion model, AI schema, and review flow as Version A.

## Runtime

- n8n Cloud is the preferred non-technical runtime.
- Self-hosted n8n is possible but not the primary target.
- Notion remains the durable source of truth.
- Telegram remains the capture and review surface.
- OpenAI remains the AI provider.

## Workflow Modules

Recommended n8n workflows:

1. Telegram capture webhook.
2. Text/photo/voice extraction.
3. Notion note creation.
4. Review message creation.
5. Telegram callback handling.
6. Approval and project state update.
7. Weekly reminder.

If n8n callback handling becomes awkward, one small HTTP helper service may be used later, but the first n8n design should avoid custom code where possible.

## Shared Behavior

Version B must preserve:

- three Notion databases: `Projects`, `Notes`, `Tasks`
- every processed capture requires review
- one optional proposed task per capture
- compact Telegram messages
- `/active`, `/project`, `/addproject`, `/clean`, `/help`
- weekly count-only reminder
- no web scraping
- no priorities or due dates
- no automatic project creation by AI

## User Setup

The non-technical setup should be documented as:

1. Create Telegram bot with BotFather.
2. Create Notion integration.
3. Create and share `Project Memory Bot` Notion parent page.
4. Import n8n workflow.
5. Fill credentials for Telegram, Notion, and OpenAI.
6. Run setup workflow to create Notion databases.
7. Add first projects with `/addproject`.

## Limitations

Version B trades testability and fine-grained typed error handling for easier installation. If complex state logic grows, keep Version A as the reference implementation and update the shared product spec first.
