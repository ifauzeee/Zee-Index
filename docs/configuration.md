# Configuration Reference

Zee-Index is configured in two places:

1. **Environment variables** (`.env`): secrets, infrastructure, storage providers. Read at startup, so restart after changing them.
2. **Admin settings** (Admin → Security & Control and Admin → Branding): branding, guest login, author visibility, local storage password. Stored in PostgreSQL, cached in Redis, applied immediately.

[`.env.example`](../.env.example) is the annotated template. `pnpm check:env` (run in CI) fails if a variable validated in `lib/env.ts` is missing from it.

- [How `.env` is read](#how-env-is-read)
- [Core](#core)
- [Admin sign-in](#admin-sign-in)
- [Google Drive](#google-drive)
- [Local storage](#local-storage)
- [External storage providers](#external-storage-providers)
- [Database and cache](#database-and-cache)
- [Scheduled jobs, limits and alerts](#scheduled-jobs-limits-and-alerts)
- [Email and chat notifications](#email-and-chat-notifications)
- [Integrations](#integrations)
- [Deployment (Docker Compose only)](#deployment-docker-compose-only)
- [Build and tooling](#build-and-tooling)
- [Admin settings (stored in the database)](#admin-settings-stored-in-the-database)

---

## How `.env` is read

- **Validation.** At startup, `lib/env.ts` validates the variables with Zod. In production, an invalid value or a missing admin password stops the process with a list of problems. In development it only logs them. `SKIP_ENV_VALIDATION=true` turns validation off. Use it only for builds without a real `.env`.
- **Warnings.** Missing `REDIS_URL`, SMTP, or (in production) `CRON_SECRET`, and a plaintext `ADMIN_PASSWORD` in production, are logged as warnings.
- **`NEXT_PUBLIC_*`** variables are compiled into the browser bundle. In Docker they are build arguments, so change them and run `docker compose up -d --build`, not just a restart.
- **Docker Compose** expands `$name` inside values of `.env`. Keep `$` out of values, or write it as `$$` if Compose is the only consumer.
- **Secrets** are never returned by any API. The admin panel only shows masked summaries.

## Core

| Variable               | Required | Default     | Description                                                                                                                                                  |
| ---------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXTAUTH_URL`         | Yes      | —           | Public URL of the app, e.g. `https://files.example.com`. Used for auth callbacks and absolute links. Must be a valid URL.                                    |
| `NEXTAUTH_SECRET`      | Yes      | —           | Signs session JWTs and derives the setup token. **Min 32 characters.** Changing it signs everyone out.                                                       |
| `SHARE_SECRET_KEY`     | Yes      | —           | Signs share-link and download tokens. **Min 32 characters.** Changing it invalidates every existing share link.                                              |
| `NEXT_PUBLIC_APP_NAME` | No       | `Zee Index` | Default name in titles and share/OG pages. Overridden by **Admin → Branding → App name**.                                                                    |
| `LOG_LEVEL`            | No       | `info`      | Pino level: `debug`, `info`, `warn`, `error`. JSON logs in production, pretty logs in development.                                                           |
| `ALLOWED_ORIGINS`      | No       | (empty)     | Comma-separated origins allowed to call `/api/download` cross-site. Empty allows all.                                                                        |
| `DOWNLOAD_TIMEOUT_MS`  | No       | `60000`     | Timeout for proxied downloads from storage providers, in milliseconds.                                                                                       |
| `SETUP_TOKEN`          | No       | derived     | Token required to finish first-run `/setup` (min 16 characters). When empty, one is derived from `NEXTAUTH_SECRET` and logged while the app is unconfigured. |

## Admin sign-in

| Variable              | Required    | Default | Description                                                                                                                    |
| --------------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ADMIN_EMAILS`        | Yes         | —       | Comma-separated admin emails. These accounts are always `ADMIN`, and are the only ones that can sign in with the env password. |
| `ADMIN_PASSWORD`      | One of both | —       | Plaintext admin password, min 8 characters. Simplest with Docker Compose (avoid `$`).                                          |
| `ADMIN_PASSWORD_HASH` | One of both | —       | bcrypt hash of the admin password. Preferred outside Compose. Takes precedence over `ADMIN_PASSWORD`.                          |

Create a hash:

```bash
node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" 'your-password'
```

Other admins (added in the **Admin** users tab) and all other users sign in with their own password, set by an admin or via invite. See [Security](security.md#admin-accounts-and-passwords).

## Google Drive

| Variable                     | Required                   | Default | Description                                                                                                                                                 |
| ---------------------------- | -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`           | For Drive / Google sign-in | —       | OAuth client ID ([Google Cloud Setup](google-cloud-setup.md)).                                                                                              |
| `GOOGLE_CLIENT_SECRET`       | For Drive / Google sign-in | —       | OAuth client secret.                                                                                                                                        |
| `GOOGLE_REFRESH_TOKEN`       | For Drive                  | —       | Written by the `/setup` wizard. While empty, the app treats itself as unconfigured and redirects to `/setup`.                                               |
| `NEXT_PUBLIC_ROOT_FOLDER_ID` | For Drive                  | —       | Drive folder shown as the root, or `root` for the whole drive. Non-admins cannot open anything outside it (or manual drives).                               |
| `NEXT_PUBLIC_MANUAL_DRIVES`  | No                         | `[]`    | Extra Drive folders or shared drives as JSON: `[{"id":"<folderId>","name":"Movies"}]`. More can be added in **Admin → Security & Control → Manual drives**. |
| `PRIVATE_FOLDER_IDS`         | No                         | `[]`    | JSON array of folder IDs hidden from everyone except admins, e.g. `["1AbC...","1XyZ..."]`.                                                                  |

## Local storage

| Variable                           | Required | Default         | Description                                                                                             |
| ---------------------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ENABLE_LOCAL_STORAGE` | No       | `false`         | Show a "Local Storage" root backed by a directory on the server. Build-time variable.                   |
| `LOCAL_STORAGE_PATH`               | No       | `storage`       | Directory to serve, absolute or relative to the app directory. In Docker it is `./storage` on the host. |
| `NEXT_PUBLIC_LOCAL_STORAGE_NAME`   | No       | `Local Storage` | Display name of the local root. Build-time variable.                                                    |

A password for the whole local root is set in **Admin → Security & Control**, not in `.env`. See [Storage Providers → Local storage](storage-providers.md#local-storage).

## External storage providers

`STORAGE_PROVIDER` selects **one** external provider that appears next to Google Drive and local storage.

| Variable           | Default        | Values                                                        |
| ------------------ | -------------- | ------------------------------------------------------------- |
| `STORAGE_PROVIDER` | `google-drive` | `google-drive` (no extra provider), `s3`, `webdav`, `dropbox` |

### S3 / Cloudflare R2 / MinIO

Enabled when `STORAGE_PROVIDER=s3` and `STORAGE_S3_BUCKET` is set.

| Variable                       | Default      | Description                                                                           |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------- |
| `STORAGE_S3_BUCKET`            | —            | Bucket name (required).                                                               |
| `STORAGE_S3_ENDPOINT`          | AWS          | Custom endpoint, e.g. `https://<account>.r2.cloudflarestorage.com`.                   |
| `STORAGE_S3_REGION`            | `us-east-1`  | Region. R2 uses `auto`.                                                               |
| `STORAGE_S3_ACCESS_KEY_ID`     | —            | Access key. When empty, the AWS SDK default credential chain is used.                 |
| `STORAGE_S3_SECRET_ACCESS_KEY` | —            | Secret key.                                                                           |
| `STORAGE_S3_FORCE_PATH_STYLE`  | `true`       | Path-style URLs. Required for R2 and MinIO. Set `false` for virtual-host AWS buckets. |
| `STORAGE_S3_ROOT_NAME`         | `S3 Storage` | Display name of the root.                                                             |

### WebDAV (Nextcloud, ownCloud, nginx, ...)

Enabled when `STORAGE_PROVIDER=webdav` and `STORAGE_WEBDAV_URL` is set.

| Variable                   | Default  | Description                                                                         |
| -------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `STORAGE_WEBDAV_URL`       | —        | Server URL (required), e.g. `https://cloud.example.com/remote.php/dav/files/alice`. |
| `STORAGE_WEBDAV_USERNAME`  | —        | Username.                                                                           |
| `STORAGE_WEBDAV_PASSWORD`  | —        | Password or app password.                                                           |
| `STORAGE_WEBDAV_BASEPATH`  | `/`      | Only this path on the server is served. Paths cannot escape it.                     |
| `STORAGE_WEBDAV_ROOT_NAME` | `WebDAV` | Display name of the root.                                                           |

### Dropbox

Enabled when `STORAGE_PROVIDER=dropbox` and a token is set.

| Variable                        | Default   | Description                                                                              |
| ------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `STORAGE_DROPBOX_REFRESH_TOKEN` | —         | Long-lived refresh token (recommended). Needs the app key and secret below.              |
| `STORAGE_DROPBOX_APP_KEY`       | —         | Dropbox app key.                                                                         |
| `STORAGE_DROPBOX_APP_SECRET`    | —         | Dropbox app secret.                                                                      |
| `STORAGE_DROPBOX_ACCESS_TOKEN`  | —         | Short-lived access token. Optional; refreshed automatically when a refresh token is set. |
| `STORAGE_DROPBOX_BASEPATH`      | (root)    | Only this path inside the Dropbox account is served.                                     |
| `STORAGE_DROPBOX_ROOT_NAME`     | `Dropbox` | Display name of the root.                                                                |

How to obtain each credential is in [Storage Providers](storage-providers.md).

## Database and cache

| Variable            | Required          | Default        | Description                                                                                                                                                            |
| ------------------- | ----------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`     | No                | `postgres`     | Compose: database user.                                                                                                                                                |
| `POSTGRES_PASSWORD` | Yes (Compose)     | —              | Compose: database password. Compose refuses to start when empty. Avoid `@`, `:`, `/` and `$`, because it is inserted into `DATABASE_URL`.                              |
| `POSTGRES_DB`       | No                | `zee_index`    | Compose: database name.                                                                                                                                                |
| `DATABASE_URL`      | Yes (non-Compose) | set by Compose | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/zee_index?schema=public`.                                                                         |
| `REDIS_URL`         | No                | set by Compose | Redis connection string. Without it, an in-memory store is used: caches, rate limits and pending 2FA state reset on restart, and multiple instances do not share them. |

What lives where:

- **PostgreSQL:** users, roles, password hashes, 2FA secrets, session versions, share links, protected folders, folder access grants, API keys, activity log, file index, app settings.
- **Redis, with a TTL (cache):** folder listings, file details, folder paths, search results, Google access token, rate-limit counters, API-key validation cache, short-lived 2FA and dedupe markers.
- **Redis, without a TTL (durable):** admin/editor role sets, manual drives, file requests, access requests, revoked share links, analytics. Compose runs Redis with append-only persistence (`--appendonly yes`), so these survive restarts. Back up the `redis_data` volume along with PostgreSQL.

Compose runs Redis with `maxmemory 128mb` and `maxmemory-policy volatile-lru`, so only keys with a TTL can be evicted and durable state is never dropped to make room.

## Scheduled jobs, limits and alerts

| Variable                         | Default  | Description                                                                                          |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `CRON_SECRET`                    | —        | Bearer token for `/api/cron/*` (min 16 characters). Without it, cron endpoints reject every request. |
| `CRON_MONITOR_INTERVAL_SECONDS`  | `300`    | Compose: how often the `cron-monitor` service runs the incident, storage and cleanup jobs.           |
| `STORAGE_LIMIT_GB`               | `15`     | Storage quota used for usage warnings.                                                               |
| `STORAGE_WARNING_THRESHOLD`      | `0.90`   | Fraction of the quota (0–1) at which the storage check warns.                                        |
| `ALERT_AUTH_FAILURE_THRESHOLD`   | `5`      | Failed sign-ins within the window that open an incident.                                             |
| `ALERT_AUTH_FAILURE_WINDOW_MS`   | `600000` | Window for the rule above (10 minutes).                                                              |
| `ALERT_DOWNLOAD_SPIKE_THRESHOLD` | `40`     | Downloads within the window that open an incident.                                                   |
| `ALERT_DOWNLOAD_SPIKE_WINDOW_MS` | `300000` | Window for the rule above (5 minutes).                                                               |

## Email and chat notifications

Email is used for invites, access requests, share notifications, storage warnings, incidents and the weekly report. All four `SMTP_*` values must be set; otherwise email is skipped.

| Variable     | Default                            | Description                                                                                 |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `SMTP_HOST`  | —                                  | SMTP server, e.g. `smtp.gmail.com`.                                                         |
| `SMTP_PORT`  | —                                  | `465` (TLS) or `587` (STARTTLS).                                                            |
| `SMTP_USER`  | —                                  | SMTP username.                                                                              |
| `SMTP_PASS`  | —                                  | SMTP password. For Gmail, use an [app password](https://myaccount.google.com/apppasswords). |
| `EMAIL_FROM` | `Zee Index <no-reply@example.com>` | Sender shown on outgoing mail.                                                              |

| Variable                    | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `NOTIFY_DISCORD_WEBHOOK`    | Discord incoming webhook URL for incident alerts. |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather.               |
| `NOTIFY_TELEGRAM_CHAT_ID`   | Chat ID(s) to notify, comma-separated.            |

Chat alerts fire together with email and share its cooldown.

## Integrations

| Variable       | Description                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `TMDB_API_KEY` | [TMDB](https://www.themoviedb.org/settings/api) key for movie and TV metadata (posters, ratings, cast) on video files. |

## Deployment (Docker Compose only)

These are read by `docker-compose.yml`, not by the app.

| Variable                  | Default     | Description                                                                     |
| ------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `CADDY_SITE`              | `localhost` | Site address Caddy serves and gets a certificate for, e.g. `files.example.com`. |
| `DUCKDNS_DOMAIN`          | —           | DuckDNS subdomain (without `.duckdns.org`). The updater idles when empty.       |
| `DUCKDNS_TOKEN`           | —           | DuckDNS token.                                                                  |
| `BACKUP_INTERVAL_SECONDS` | `86400`     | How often `db-backup` dumps the database.                                       |
| `BACKUP_RETENTION_DAYS`   | `7`         | Backups older than this are deleted.                                            |

## Build and tooling

| Variable              | Default | Description                                                                              |
| --------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `SKIP_ENV_VALIDATION` | `false` | Skip startup validation. The Docker build sets it, since no `.env` exists at build time. |
| `ANALYZE`             | `false` | `pnpm analyze` sets it to produce bundle-analyzer reports.                               |

## Admin settings (stored in the database)

Changed in **Admin → Security & Control** (guest login, author visibility, local storage password) and **Admin → Branding** (name, logo, favicon, color). No restart needed.

| Setting                | Default     | Effect                                                                                                    |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| App name               | `Zee Index` | Name in the header, titles and share pages (max 80 characters).                                           |
| Logo URL / Favicon URL | (empty)     | Absolute URL or a path starting with `/`.                                                                 |
| Primary color          | (empty)     | Hex color, e.g. `#7c3aed`.                                                                                |
| Disable guest login    | off         | Hides "Continue as Guest" and refuses guest sign-in.                                                      |
| Hide author            | off         | Removes owner and last-modifier names from file details for non-admins (done on the server).              |
| Local storage password | off / empty | Requires a password before anyone except admins can open the local storage root. Stored as a bcrypt hash. |
