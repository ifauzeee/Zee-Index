# Zee-Index — AGENTS.md

## Project identity

Self-hosted Google Drive Explorer, CMS & streaming platform. Next.js 16 App Router + React 19 + TypeScript strict. pnpm v10.33.2, Node.js 20.x. Google Drive API v3 + Prisma/PostgreSQL 16 + Redis 7.

## Commands (exact)

| Command                                 | What it does                                                |
| --------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                              | Dev server with Turbopack (uses `dotenv --`)                |
| `pnpm dev:webpack`                      | Dev server with Webpack fallback                            |
| `pnpm build`                            | Production build                                            |
| `pnpm start`                            | Production server                                           |
| `pnpm typecheck`                        | `tsc --noEmit`                                              |
| `pnpm lint`                             | ESLint                                                      |
| `pnpm format:check` / `pnpm format:fix` | Prettier                                                    |
| `pnpm check:all`                        | typecheck → format:check → lint (sequential, order matters) |
| `pnpm fix:all`                          | format:fix + lint --fix                                     |
| `pnpm test`                             | Vitest unit tests (`__tests__/`)                            |
| `pnpm test:e2e`                         | Playwright E2E tests (`e2e/`)                               |
| `pnpm analyze`                          | Bundle analyzer (`cross-env ANALYZE=true next build`)       |
| `pnpm docker:dev` / `pnpm docker:prod`  | Docker Compose                                              |
| `pnpm prepush`                          | typecheck only                                              |

Pre-commit hook (Husky) runs `npx lint-staged` — Prettier on staged files, nothing else.

## Architecture

- `app/[locale]/` — i18n-prefixed routes. Always use `stripLocaleFromPathname()` in middleware.
- `app/api/` — 26 endpoint groups (admin/ auth/ files/ download/ share/ cron/ etc.)
- `lib/` — core business logic. Key files:
  - `api-middleware.ts` — route wrapper factory: `createPublicRoute`, `createUserRoute`, `createEditorRoute`, `createAdminRoute`, `createCronRoute`. Use these, never raw handlers.
  - `auth.ts` — auth helpers (not the NextAuth config)
  - `app-config.ts` — app config read/write with fallback chain (Redis → memory → DB)
  - `env.ts` — Zod env validation on startup; provides build-time fallbacks
  - `constants.ts` — `REDIS_KEYS`, `RATE_LIMITS`, `ERROR_MESSAGES`, `MIME_TYPES`
  - `errors.ts` — `RequestError` class for structured responses
  - `kv/` — KV factory: Redis → in-memory fallback. Use the `kv` singleton.
  - `storage/` — file storage abstraction: providers/ (google-drive, s3, webdav) + local
  - `drive/` — Google Drive API client (auth, fetchers, mutators)
  - `services/` — biz logic (download, health-service, etc.)
- `components/` — React components: admin/, file-browser/, file-details/, layout/, common/, ui/
- `prisma/schema.prisma` — DB schema. Models: User, Account, Session, ActivityLog, ShareLink, FolderAccess, ProtectedFolder, FileIndex, AdminConfig.
- `types/` — TS type definitions (`next-auth.d.ts` extends NextAuth types)
- `messages/{en,id,zh-TW}.json` — i18n translations (3 locales)

All API routes use `export const dynamic = "force-dynamic"`.

## Route handler pattern

```ts
export const GET = createAdminRoute(async ({ request, session, body, query, params }) => {
  // request body auto-parsed if bodySchema in options
  // auth/session pre-validated per role
  return NextResponse.json({ ... });
});
```

`createRouteHandler` options: `role`, `includeSession`, `requireEmail`, `rateLimit`, `bodySchema`, `querySchema`, `paramsSchema`, `internalErrorMessage`.

Existing role wrappers: `createPublicRoute`, `createUserRoute` (no guest), `createEditorRoute` (ADMIN/EDITOR), `createAdminRoute`, `createCronRoute` (Bearer token via CRON_SECRET).

Legacy wrapper: `withAdminSession(handler)`, `withEditorSession(handler)`.

## Middleware execution order

1. Skip: `/_next`, `/static`, `/sw.js`, `/manifest.webmanifest`, `/api/health`
2. Download token signature check (`/api/download`)
3. Rate limiting per tier (API / ADMIN / AUTH / DOWNLOAD)
4. App configuration check → redirect to `/setup` if unconfigured
5. Auth check (NextAuth JWT), 2FA enforcement
6. i18n locale prefix routing
7. Share token validation
8. Folder password protection

## Auth & roles

- NextAuth v5 (beta) with JWT strategy. Providers: Google OAuth, Email+Password (credentials), Guest.
- JWT cookie: `authjs.session-token` (httpOnly, lax, secure in prod)
- Roles: ADMIN > EDITOR > USER > GUEST. Stored in JWT token.
- Admin resolved from: DB `User.role`, Redis `admins` set, env `ADMIN_EMAILS`.
- 2FA via TOTP (Redis-backed). Guest can be disabled in admin settings.
- Password: prefer bcrypt hash (`ADMIN_PASSWORD_HASH`), fallback plaintext (`ADMIN_PASSWORD`).

## KV / caching

Factory in `lib/kv/index.ts`: Redis → InMemoryKV fallback. Singleton `kv`. Without Redis, data resets on restart. Redis TTLs in `constants.ts` (3600s for folder content, 600s for file details, etc.). Rate limiting uses the same KV.

## Storage abstraction

`STORAGE_PROVIDER` env var: `google-drive` (default), `s3`, `webdav`. Entrypoint in `lib/storage/index.ts`. Providers in `lib/storage/providers/`. Local files via `lib/storage/local.ts` (enabled by `NEXT_PUBLIC_ENABLE_LOCAL_STORAGE`).

## Testing

- **Unit tests**: `__tests__/` with Vitest + jsdom. Setup at `test/setup.ts` (mocks logger).
- **E2E tests**: `e2e/` with Playwright. 3 browsers; CI runs chromium only.
- **Coverage**: `coverage/` via `@vitest/coverage-v8`.
- **CI workflow**: lint → typecheck → unit tests → e2e (chromium) → build. Requires PostgreSQL + Redis services.

## Docker

Multi-stage build: base (node:20-alpine + pnpm) → deps (frozen lockfile) → builder (prisma generate + next build, standalone output) → runner (dumb-init + entrypoint). Entrypoint auto-creates DB and runs `prisma migrate deploy` (or `prisma db push` if no migrations dir). Health check: `curl -f /api/health`.

Resource limits: zee-index 512MB, postgres 200MB, redis 150MB, caddy 50MB, cron-monitor 40MB.

## Env quirks

- `SKIP_ENV_VALIDATION=true` for builds without full `.env`.
- `NEXT_PUBLIC_*` build args must be passed to Docker build.
- `ADMIN_PASSWORD` min 8 chars (dev); prefer `ADMIN_PASSWORD_HASH` (bcrypt) in prod.
- Warnings on startup if Redis, SMTP, or CRON_SECRET are missing.
- Google Drive refresh token obtained via `/setup` OAuth flow.
- Secrets never exposed to API responses (admin panel shows masked summary).

## Important constraints

- `lib/api-middleware.ts` handles auth, rate limiting, Zod validation — do NOT bypass.
- All API routes should use route wrappers, not raw `NextResponse` with manual auth checks.
- CSP is nonce-based, applied in `middleware.ts` — route handlers should not set CSP manually.
- Download tokens are JWT-signed via `SHARE_SECRET_KEY`, validated in middleware.
- Activity logging is async fire-and-forget (dynamic import) — never `await` it.
- `@/*` path alias maps to project root.
- TypeScript strict with `noImplicitAny: true`. Do not suppress with `as any`.
- ESLint has `@typescript-eslint/no-explicit-any: off` — but still prefer explicit types.
- Zod schemas used at boundaries (env validation, API body/query validation).
- Pino logger with pino-pretty in dev. Use structured logging (`{ key: val }, "[Component] message"`).
- Prisma client generated at build time; `prisma/` dir copied to runner for migrations.
