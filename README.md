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

- [Project onboarding lesson](lessons/0001-project-onboarding.html)
- [Product spec](docs/product-spec.md)
- [Version A: Vercel](docs/version-a-vercel.md)
- [Version B: n8n](docs/version-b-n8n.md)
- [CI/CD](docs/ci-cd.md)

## Local Commands

```bash
npm install
npm run lint
npm run lint:fix
npm run typecheck
npm test
npm run build
npm run setup:notion
npm run setup:telegram
```

## Setup

Use [Project onboarding lesson](lessons/0001-project-onboarding.html) for the full Telegram, Notion, OpenAI, Vercel, GitHub, and webhook setup path.

After setting `TELEGRAM_BOT_TOKEN`, run `npm run setup:telegram` to register the native Telegram command menu. Run it again whenever the visible command list changes.
