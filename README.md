# Project Memory Bot

Private Telegram-to-Notion project memory bot.

The first implementation is intentionally small:

- Telegram captures text, photos, voice notes, and forwarded messages.
- OpenAI extracts a short summary and at most one proposed task.
- Notion stores projects, notes, and tasks.
- Every capture requires Telegram review before it updates project state.
- Version A runs on Vercel with Next.js, Vercel Queue, TypeScript, and Effect.
- Version B is documented as a standalone n8n implementation for later.

## Docs

- [Product spec](docs/product-spec.md)
- [Version A: Vercel](docs/version-a-vercel.md)
- [Version B: n8n](docs/version-b-n8n.md)

## Local Commands

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Setup

1. Create a Notion page named `Project Memory Bot`.
2. Share it with your Notion integration.
3. Copy `.env.example` to `.env.local` and fill the values.
4. Optionally copy `config/projects.example.json` to `config/projects.json`.
5. Run:

```bash
npm run setup:notion
```

Deploy to Vercel, then set the Telegram webhook to:

```text
https://<your-project>.vercel.app/api/telegram/webhook
```
