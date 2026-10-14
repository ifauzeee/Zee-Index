# Development

Everything needed to work on the Zee-Index code: local setup, project layout, conventions, tests and CI. Contribution workflow is in [CONTRIBUTING.md](../CONTRIBUTING.md).

- [Local setup](#local-setup)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Request flow](#request-flow)
- [Writing an API route](#writing-an-api-route)
- [Conventions](#conventions)
- [Database changes](#database-changes)
- [Adding an environment variable](#adding-an-environment-variable)
- [Translations](#translations)
- [Testing](#testing)
- [Continuous integration](#continuous-integration)

---

## Local setup

Requirements: **Node.js 22** (20–24 supported), **pnpm 10** (`corepack enable` installs the pinned version), Docker for PostgreSQL and Redis.

```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
corepack enable
pnpm install

# PostgreSQL and Redis
docker run -d --name zee-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=zee_index -p 5432:5432 postgres:16-alpine
docker run -d --name zee-redis -p 6379:6379 redis:7-alpine

cp .env.example .env
```

In `.env`, set at least:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<32+ random chars>"
SHARE_SECRET_KEY="<32+ random chars>"
ADMIN_EMAILS="you@example.com"
ADMIN_PASSWORD="dev-password-123"
DATABASE_URL="postgresql://postgres:devpass@localhost:5432/zee_index?schema=public"
REDIS_URL="redis://localhost:6379"
```

Then:

```bash
pnpm prisma migrate deploy
pnpm dev                     # http://localhost:3000 (Turbopack)
```

To work on Drive features, follow [Google Cloud Setup](google-cloud-setup.md) with `http://localhost:3000` redirect URIs and run `/setup`. To work without Drive, enable local storage (`NEXT_PUBLIC_ENABLE_LOCAL_STORAGE=true`) and set a dummy `GOOGLE_REFRESH_TOKEN` so the app counts as configured. Drive calls will fail, but local storage works.

Alternatively, `pnpm docker:dev` runs PostgreSQL, Redis and the dev server in containers (`docker-compose.dev.yml`).

## Scripts

| Command                                           | What it does                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                                        | Dev server with Turbopack (loads `.env` through `dotenv`)              |
| `pnpm dev:webpack`                                | Dev server with Webpack, if Turbopack misbehaves                       |
| `pnpm build`                                      | Production build (standalone output)                                   |
| `pnpm start`                                      | Run the production build                                               |
| `pnpm typecheck`                                  | `tsc --noEmit`                                                         |
| `pnpm lint`                                       | ESLint                                                                 |
| `pnpm format:check` / `pnpm format:fix`           | Prettier                                                               |
| `pnpm check:all`                                  | typecheck → format:check → lint → check:i18n (in that order)           |
| `pnpm fix:all`                                    | Prettier write + ESLint fix                                            |
| `pnpm check:env`                                  | Every variable in `lib/env.ts` must be in `.env.example`               |
| `pnpm check:i18n`                                 | `messages/en.json`, `id.json` and `zh-TW.json` must have the same keys |
| `pnpm check:bundle`                               | Bundle size budget                                                     |
| `pnpm test`                                       | Vitest (watch mode; `pnpm test -- run` for a single run)               |
| `pnpm test:e2e`                                   | Playwright (run `npx playwright install` once first)                   |
| `pnpm analyze`                                    | Build with the bundle analyzer                                         |
| `pnpm audit`                                      | `pnpm audit --audit-level=moderate`                                    |
| `pnpm docker:dev` / `docker:prod` / `docker:stop` | Docker Compose shortcuts                                               |

Git hooks (Husky): **pre-commit** runs lint-staged (Prettier and ESLint on staged files). **pre-push** runs `pnpm typecheck`.

## Project structure

```
app/
  [locale]/              Pages under a language prefix (en, id, zh-TW)
    (main)/              Browser: folder, file, search, favorites, dashboard, storage, profile, trash, share
    admin/               Admin panel and its sub-pages
    login/ verify-2fa/   Sign-in and 2FA
    setup/               First-run wizard
    request/[token]/     Public file-request upload page
  api/                   Route handlers (see docs/api/README.md)
  actions/               Server actions (favorites, tags, pinned folders)
components/
  admin/                 Admin panel UI
  file-browser/          Listing, toolbar, selection, modals
  file-details/          Previews and players (video, PDF, code, Office, EPUB, images)
  layout/                Header, sidebar, footer
  features/              Command palette, search results
  ui/                    Radix-based primitives
hooks/                   Client hooks (upload, keyboard navigation, notifications, ...)
lib/
  api-middleware.ts      Route wrappers: auth, roles, 2FA, rate limits, Zod validation
  auth.ts                Access tokens from cookies, share token checks
  securityUtils.ts       isAccessRestricted: the single access rule
  share-grant.ts         What a share link grants
  credentials.ts         Password hashes and 2FA state (PostgreSQL)
  session-version.ts     Session revocation
  env.ts                 Zod validation of the environment
  app-config*.ts         Admin settings (DB + Redis cache)
  constants.ts           Redis keys, TTLs, rate limits, error messages
  kv/                    Redis client with in-memory fallback (`kv` singleton)
  drive/                 Google Drive client: auth, fetchers, mutators, ID validation
  storage/               Local storage, provider abstraction (S3, WebDAV, Dropbox), path IDs
  services/              Download service, health checks
  events/                Activity event pipeline
  openapi/               OpenAPI spec (schemas + paths)
messages/                Translations (en, id, zh-TW)
prisma/                  schema.prisma and migrations
types/                   Shared TypeScript types (ZeeFile, NextAuth augmentation)
proxy.ts                 Next.js 16 proxy (formerly middleware): auth, CSP, rate limits, i18n
auth.ts                  NextAuth configuration
__tests__/  e2e/         Vitest unit tests, Playwright tests
scripts/                 Entrypoint and CI check scripts
```

## Request flow

Every request first passes `proxy.ts`, which runs on the Node.js runtime:

1. Skips static assets and `/api/health`.
2. Checks download token signatures on `/api/download`.
3. Validates `Authorization: Bearer <api key>` on API routes. It removes any client-sent `x-auth-method` / `x-api-key-*` headers first, then sets them itself.
4. Rate-limits per tier (`API_KEY`, `ADMIN`, `API`).
5. Redirects to `/setup` (or answers `503` for APIs) while the app is unconfigured.
6. Lets public pages and APIs through: `PUBLIC_PATHS`, `PUBLIC_API_EXACT` (exact match) and `PUBLIC_API_PREFIXES` (prefix match).
7. Validates `share_token`, the session, guest restrictions and pending 2FA.
8. Checks folder passwords for `/folder/[id]` and `/api/files`.
9. Applies i18n routing and the nonce-based CSP.

The route handler then runs inside a `create*Route` wrapper, which repeats the authorization for its role, so a route never relies on the proxy alone.

## Writing an API route

Always use a wrapper from `lib/api-middleware.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createEditorRoute } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ fileId: z.string().min(1) });

export const POST = createEditorRoute(
  async ({ request, session, body }) => {
    // body is parsed and typed; session is a verified EDITOR or ADMIN
    return NextResponse.json({ ok: true });
  },
  { bodySchema, rateLimit: "API" },
);
```

| Wrapper             | Who passes                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `createPublicRoute` | Everyone. `session` is `null` for anonymous and pending-2FA users. Add `includeSession: true` to read it |
| `createUserRoute`   | Signed-in, non-guest users                                                                               |
| `createEditorRoute` | `EDITOR` and `ADMIN` (API keys need `files:write`)                                                       |
| `createAdminRoute`  | `ADMIN` only                                                                                             |
| `createCronRoute`   | `Authorization: Bearer $CRON_SECRET`                                                                     |

Options: `bodySchema`, `querySchema`, `paramsSchema`, `rateLimit` (`"API" | "AUTH" | "ADMIN" | "DOWNLOAD" | false`), `includeSession`, `requireEmail`, `allowPending2FA`, `permission`, `internalErrorMessage`.

If the route reads or changes a specific file, check access with `isAccessRestricted(id, tokens, email)` (or `canModifyAll` for editor actions), never with the folder from the URL. If it is public, add it to `PUBLIC_API_EXACT` in `proxy.ts`. Document it in `lib/openapi/paths-*.ts`.

## Conventions

- **TypeScript strict.** No `any` (ESLint error in production code), no unused imports, no `as any`.
- **Validation:** Zod at every boundary (env, request body, query, params, stored JSON).
- **Logging:** `logger` from `lib/logger` (Pino) everywhere, client components included, with structured fields: `logger.error({ err, fileId }, "[Download] Stream failed")`. No `console.*`.
- **Activity logging** is fire-and-forget: `void logActivity(...)`. Never `await` it.
- **Cache writes need a TTL.** Redis runs with `volatile-lru`, so a key without a TTL is treated as durable state and never evicted.
- **Credentials live in PostgreSQL** (`lib/credentials.ts`), never only in Redis.
- **After changing a user's role, password or 2FA**, call `revokeSessions(email)`.
- **Redirects** after sign-in go through `safeCallbackUrl`.
- **IDs in URLs** are built with `encodeURIComponent` (or `getItemHref` in `lib/file-location.ts`). Route params arrive percent-encoded: decode them before comparing or checking access.
- **CSP** is set in `proxy.ts` only.
- **Commits:** Conventional Commits in English, `type(scope): description`, one logical change per commit. Changes go through a branch and a pull request, squash-merged.

## Database changes

```bash
# edit prisma/schema.prisma, then:
pnpm prisma migrate dev --name short_description
```

Commit the generated `prisma/migrations/<timestamp>_<name>/migration.sql`. Docker applies migrations with `prisma migrate deploy` on start. Never use `db push` against a real database.

## Adding an environment variable

1. Add it to the schema in `lib/env.ts` (and to the build-time fallback object if the build needs it).
2. Add it, with a comment, to `.env.example`. `pnpm check:env` fails otherwise.
3. Document it in [Configuration](configuration.md).
4. If it is `NEXT_PUBLIC_*` and used in Docker, add it as a build argument in `Dockerfile` and `docker-compose.yml`.

## Translations

UI text lives in `messages/en.json`, `messages/id.json` and `messages/zh-TW.json`, read with `next-intl` (`useTranslations` / `getTranslations`). Add every new key to all three files: `pnpm check:i18n` fails on missing keys. API error messages are in English.

## Testing

```bash
pnpm test                       # watch mode
pnpm test -- run                # single run, as in CI
pnpm test -- run path/to/file   # one file
pnpm test -- run --coverage     # coverage report in coverage/
```

- Unit tests live in `__tests__/` (Vitest + jsdom). `test/setup.ts` mocks the logger.
- Route tests usually mock `@/lib/api-middleware` and call the exported handler with a `NextRequest`. See `__tests__/unit/app/api/` for examples.
- For a bug fix, add a test that fails on the old code.

**End-to-end:**

```bash
npx playwright install
E2E_ADMIN_EMAIL=you@example.com E2E_ADMIN_PASSWORD=dev-password-123 pnpm test:e2e
```

Playwright starts the app and runs Chromium, Firefox and WebKit locally (CI runs Chromium only). See `.github/workflows/ci.yml` for the environment CI uses.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request, with PostgreSQL and Redis services:

1. `pnpm install --frozen-lockfile`
2. `pnpm audit --audit-level=high`
3. `pnpm check:env`
4. `prisma generate` and `prisma migrate deploy`
5. lint, `check:i18n`, typecheck
6. unit tests (`pnpm test -- run`)
7. production build and bundle budget (`check:bundle`)
8. Playwright end-to-end tests (Chromium)

A separate workflow builds the Docker image. Workflows run with `contents: read` permissions, and third-party actions are pinned by commit SHA.
