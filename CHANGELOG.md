# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Security hardening from the October 2026 audits, plus fixes found while verifying them in a full Docker deployment.

### Upgrade notes

- **`POSTGRES_PASSWORD` is now required** by `docker-compose.yml`. Set it in `.env` before `docker compose up`.
- **Recreate Redis and Caddy** after updating: `docker compose up -d --force-recreate redis caddy`. Redis now runs with `volatile-lru`, and Caddy limits request bodies to 30 MB.
- **Passwords and 2FA moved to PostgreSQL.** Existing Redis entries are migrated automatically on first sign-in. New migrations run on start.
- **`ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` only sign in the emails in `ADMIN_EMAILS`.** Admins added in the panel need their own password (or Google sign-in).
- **Sessions end after 7 days without use**, and changing a password, role or 2FA ends all of that user's sessions.
- **Passwords need at least 8 characters** everywhere.
- **First-run `/setup` requires a setup token**: `SETUP_TOKEN`, or the token printed in the log.
- `KV_REST_*` / `UPSTASH_REDIS_REST_*` were removed; they were never used outside the old Edge middleware.

### Security

- Upgraded Next.js (RCE in `next/og`, image-optimizer SSRF, cache poisoning), sharp (librsvg CVE) and nodemailer; patched transitive dependencies.
- `/api/proxy-image` only accepts JPEG, PNG, GIF, WebP and AVIF (checked by signature, so SVG cannot get through), with size, pixel and time limits.
- File and folder pages decide access from the item, not the URL. Breadcrumbs and page titles no longer leak names of restricted folders. Owner emails are no longer sent to visitors.
- Share links grant exactly the shared item(s), work inside protected folders, and their watermark, download and `maxUses` rules can no longer be bypassed by dropping the token or using `Range`. Watermarking fails closed.
- Editors can only modify files in folders they can open. Drive IDs are validated before reaching the Drive API.
- Folder protection now covers S3, WebDAV and Dropbox. WebDAV paths cannot escape the base path.
- Sessions are revocable (`sessionVersion`). TOTP codes are single-use. Post-login redirects stay on the site. Sign-in and password changes are rate-limited per account as well as per IP.
- API key validation is cached by a hash of the full key and checks expiry.
- `middleware.ts` became `proxy.ts`, running on Node.js, so rate limits and share revocation use Redis and API keys validate against the database.
- Request bodies are capped before authentication. Provider uploads are isolated per upload. Email-sending and external-API routes are rate-limited.
- Office previews never send tokened download URLs to Microsoft.
- CI runs with read-only permissions and SHA-pinned actions. The entrypoint no longer falls back to `prisma db push --accept-data-loss`.

### Added

- S3 uploads use multipart (8 MB parts): no server-side size cap and low memory use.
- Shared collections can contain local-storage and provider files.
- Full documentation in `docs/`: getting started, Google Cloud setup, configuration reference, storage providers, deployment, user and admin guide, security model, API reference, development, FAQ.

### Fixed

- EPUB preview works (epub.js is loaded on demand and renders at full size).
- Tailwind `group-hover` styles are generated again.
- Local-storage and provider file pages no longer deny visitors (route params are decoded before access checks).
- Files whose names contain `&`, `+`, `,`, `'`, accents or CJK characters can be downloaded.
- Links to local and provider files are URL-encoded correctly from the share, favorites and dashboard pages.
- Server-side logs are structured JSON everywhere (no `console.*`).

---

## [2.0.0] - 2026-05-21

### Added

- **Multi-Drive & Storage Support**:
  - Implemented dynamic subfolder upload capability for File Requests allowing senders to specify custom directories.
  - Added support for Google Drive uploads under specific parent folders in file requests.
  - Added local storage target capability for file explorer and file request targets.
- **Dynamic Share Links**:
  - Added dynamic parameters editing (`loginRequired`, `maxUses`, `preventDownload`, `hasWatermark`, `watermarkText`, `expiresAt`) for active share links.
  - Implemented instantaneous synchronization to Redis cache (`share:link:${jti}`) to ensure Edge Middleware enforces new settings immediately.
  - Added shared collections allowing multiple files/folders to be grouped in a single share link.
  - Built a Framer Motion-powered share editing modal in the Admin dashboard.
- **File Versioning / Revisions**:
  - Added Google Drive File Version History UI modal for administrators.
  - Exposed revision tracking context menu action seamlessly integrated with the explorer state lifecycle.
- **Security & Session Enhancements**:
  - Implemented secure 2FA (Two-Factor Authentication) using standard TOTP algorithms (verify, generate, status, disable, and verification at login).
  - Improved Local Storage security by introducing password-protected folder access and session token controls.
- **Infrastructure & Monitoring**:
  - Added incident monitor evaluations (`/api/cron/incident-monitor`).
  - Added real-time operational status metrics, error-trend tracking, and database/cache latency stats in Admin panel.
  - Set up standard healthcheck endpoints `/api/health` and `/api/admin/system-health`.

### Changed

- Increased Docker healthcheck startup period to `180s` to accommodate longer startup times on slower hosts (Prisma database migrations and Next.js initialization).
- Improved caching using lazy-initialized Redis singleton connections.

### Fixed

- Fixed API route endpoints mapping errors and HTTP methods for `/api/files/delete`, `/api/files/rename`, `/api/files/move`, and `/api/files/update` from `DELETE`/`PATCH` to `POST` in the codebase.
- Standardized file request upload pipeline to prevent duplicate storage writes.
- Fixed context menu click lifecycle state issue by storing details persistently in `actionState`.

---

## [1.0.0] - 2026-01-15

### Added

- Initial release of Zee-Index.
- Basic Google Drive indexing and explorer interface.
- timed share link generation.
- Admin dashboard for standard configurations.
