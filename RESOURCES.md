# Project Memory Bot Resources

## Knowledge

- [Project product spec](docs/product-spec.md)
  The source of truth for Telegram UX, Notion databases, AI output shape, review buttons, and reminder behavior. Use before changing product behavior.
- [Version A: Vercel engineer implementation](docs/version-a-vercel.md)
  The source of truth for the current code architecture and runtime boundaries. Use before changing routes, queue flow, or deployment setup.
- [Version B: n8n implementation design](docs/version-b-n8n.md)
  The future shareable/non-technical version. Use only when checking whether Version A changes preserve the shared product contract.
- [Checks and Deployment](docs/ci-cd.md)
  The source of truth for the simplified CI/deployment split: GitHub checks only, Vercel Git deploys preview and production.
- [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
  Official reference for `app/api/**/route.ts` files and Web `Request` / `Response` handlers.
- [Vercel Git deployments](https://vercel.com/docs/git)
  Official reference for preview and production deployments created from Git branches and pull requests.
- [Vercel Queues](https://vercel.com/docs/queues)
  Official reference for queue durability, producer/consumer behavior, retries, and observability.
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
  Official reference for scheduled routes used by the weekly reminder.
- [Telegram Bot API](https://core.telegram.org/bots/api)
  Official reference for webhook updates, callback queries, message deletion, file downloads, and bot methods.
- [Notion API introduction](https://developers.notion.com/reference/intro)
  Official reference for authentication, page/database objects, JSON conventions, and pagination.
- [OpenAI text generation guide](https://developers.openai.com/api/docs/guides/text)
  Official reference for model calls and prompt-driven structured text generation.
- [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
  Official reference for the lint setup used to enforce local code style and React/Next rules.
- [Vitest guide](https://vitest.dev/guide/)
  Official reference for the fixture-style local tests in this repo.

## Wisdom (Communities)

- [Telegram Bot API discussion](https://t.me/BotTalk)
  Use for real-world bot API behavior and platform changes.
- [Vercel Community](https://community.vercel.com/)
  Use for deployment, queues, cron, and serverless runtime questions.
- [Notion Developers community](https://developers.notion.com/page/notion-developer-community)
  Use for Notion API limitations and schema/workspace edge cases.

## Gaps

- No dedicated resource has been selected yet for designing a polished n8n Version B template. Keep Version B as documentation until the personal bot works reliably.
