# Contributing to Zee-Index

Thanks for helping improve Zee-Index. This page covers the workflow. The technical details (setup, structure, conventions, tests) are in [docs/development.md](docs/development.md).

## Before you start

- **Bugs:** search the issues first, then open one with steps to reproduce, the expected and actual behaviour, and relevant log lines (`docker compose logs zee-index`).
- **Features:** open an issue to discuss bigger changes before writing code.
- **Security issues:** do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).

## Setup

```bash
git clone https://github.com/<your-username>/Zee-Index.git
cd Zee-Index
corepack enable          # pnpm 10, as pinned in package.json
pnpm install
cp .env.example .env     # see docs/development.md#local-setup
pnpm prisma migrate deploy
pnpm dev
```

You need PostgreSQL 16 and Redis 7. The development guide shows how to start both with Docker.

## Workflow

1. Create a branch from `main`: `feat/...`, `fix/...`, `docs/...`, `refactor/...`, `chore/...`, `test/...`.
2. Make **one logical change per commit**, with a [Conventional Commits](https://www.conventionalcommits.org/) message in English:
   ```
   type(scope): short description

   Why the change is needed and what it does.
   ```
   Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `ci`, `security`.
3. Before pushing, run:
   ```bash
   pnpm check:all      # typecheck, prettier, eslint, i18n parity
   pnpm check:env      # if you touched environment variables
   pnpm test -- run
   ```
   The pre-commit hook formats staged files. The pre-push hook runs the type check. Do not bypass hooks.
4. Open a pull request against `main`. Describe what changed, why, and how you tested it. Link the issue.
5. CI must pass (lint, typecheck, unit tests, build, end-to-end). Pull requests are **squash-merged**.

## What reviewers look for

- **Tests.** A bug fix comes with a test that fails without the fix. New behaviour comes with tests.
- **Security.** API routes use the `create*Route` wrappers. Item access is checked with `isAccessRestricted`, never trusted from the URL. Input is validated with Zod.
- **Types.** TypeScript strict, no `any`, no unused code.
- **Logging.** `logger` from `lib/logger`, not `console`.
- **Translations.** New UI text exists in `messages/en.json`, `id.json` and `zh-TW.json`.
- **Docs.** New environment variables, endpoints or behaviour changes are reflected in `docs/` and `.env.example`. User-visible changes get a line in [CHANGELOG.md](CHANGELOG.md) under _Unreleased_.
- **Scope.** Small, focused pull requests are reviewed faster.

## Code style

- TypeScript everywhere. Tailwind CSS for styling. Radix-based primitives from `components/ui`.
- Keep components small and accessible: labels, keyboard support, focus states.
- Prettier and ESLint decide formatting. Do not fight them.

## License

By contributing, you agree that your contributions are licensed under the project's license: the **GNU Affero General Public License v3.0** with the attribution requirement described in [LICENSE](LICENSE).
