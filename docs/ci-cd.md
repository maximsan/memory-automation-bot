# Checks and Deployment

The project keeps CI and deployment separate:

- GitHub Actions runs code checks.
- Vercel Git integration owns preview and production deployments.

## Workflow

`.github/workflows/checks.yml` runs on:

- pull requests to `main`
- pushes to `main`
- manual `workflow_dispatch`

It runs:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

The workflow does not deploy and does not need Vercel credentials.

## Deployment

Vercel Git integration owns deployment. GitHub proves the project is healthy; Vercel handles the deployment lifecycle.

Use [Project onboarding lesson](../lessons/0001-project-onboarding.html) for the concrete setup, branch, preview, merge, production, and Telegram webhook steps.

## GitHub Secrets

No GitHub repository secrets are required for the current workflow.

Do not add a GitHub Actions Vercel deploy job unless you intentionally want GitHub to own deployment again. That stronger setup needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`; the current setup avoids those secrets.
