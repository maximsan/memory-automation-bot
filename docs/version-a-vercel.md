# Version A: Vercel Engineer Implementation

Version A is the personal implementation. It optimizes for reliability, low cost, and testability for a software engineer.

## Stack

- Next.js API routes on Vercel Hobby
- TypeScript
- Vercel Queue for async processing
- Effect only in the core processing layer
- OpenAI API for extraction, vision/OCR, and transcription
- Notion API for durable data
- Telegram Bot API for capture and review

n8n is not used in Version A.

## Data Flow

1. Telegram sends a webhook update.
2. The webhook validates the Telegram user ID.
3. Commands are handled immediately.
4. Captures create a `Notes` row with `Needs Review`.
5. The bot sends a temporary processing message and stores its Telegram message ID on the note.
6. A Vercel Queue job is created with the note ID and capture metadata.
7. The queue worker downloads media if needed, calls OpenAI, updates the note, and edits the Telegram message into a review card.
8. Review callbacks approve, change project, edit summary, or remove.
9. Approval updates the note, updates the latest project state, and optionally creates one `Proposed` task.

## Routes

- `POST /api/telegram/webhook`
- `POST /api/queues/process-capture`
- `GET /api/cron/weekly`
- `GET /api/health`

## Config

Secrets live in Vercel environment variables:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USER_IDS`
- `OPENAI_API_KEY`
- `NOTION_TOKEN`
- `NOTION_PARENT_PAGE_ID`
- `CRON_SECRET`

Model and limit config:

- `OPENAI_TEXT_MODEL`
- `OPENAI_VISION_MODEL`
- `OPENAI_TRANSCRIBE_MODEL`
- `MAX_TEXT_CHARS`
- `MAX_VOICE_SECONDS`
- `DAILY_CAPTURE_SOFT_LIMIT`
- `DAILY_CAPTURE_HARD_LIMIT`

Editable prompts:

- `prompts/extract-note.md`
- `prompts/update-project-state.md`

Optional seed projects:

- `config/projects.json`

## Setup Script

Use [Project onboarding lesson](../lessons/0001-project-onboarding.html) for the full personal setup path.

The Notion setup script is conservative:

- creates missing databases
- reuses matching databases
- stops on schema conflicts
- does not mutate incompatible existing schema automatically

## Deployment Model

GitHub Actions runs checks only. Vercel Git integration owns preview and production deployment. The operational flow lives in [Checks and Deployment](ci-cd.md) and the onboarding lesson.

## Failure Handling

- Duplicate Telegram message IDs do not create duplicate notes.
- Total extraction failure trashes the pending note and edits the Telegram message with a retry hint.
- Partial extraction leaves a `Needs Review` note.
- Notion write failure is reported in Telegram.
- Queue is not the source of truth; Notion note creation happens before queueing.

## Tests

Use fixtures and direct route/core calls locally. Real Telegram is tested only after deployment.

Required coverage:

- Telegram update parsing
- command parsing
- AI output validation
- project matching
- callback behavior
- setup schema checks
- idempotency
- project state update calls
