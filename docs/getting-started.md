# Getting Started

This guide takes you from an empty machine to a running Zee-Index instance with Google Drive connected and an admin account you can sign in with. It uses Docker Compose, which is the supported way to run Zee-Index. For running without Docker, see [Development](development.md).

- [1. Requirements](#1-requirements)
- [2. Get the code](#2-get-the-code)
- [3. Create `.env`](#3-create-env)
- [4. Prepare Google Cloud](#4-prepare-google-cloud)
- [5. Start the stack](#5-start-the-stack)
- [6. First-run setup](#6-first-run-setup)
- [7. Sign in as admin](#7-sign-in-as-admin)
- [8. Next steps](#8-next-steps)

---

## 1. Requirements

| Requirement                        | Notes                                                      |
| ---------------------------------- | ---------------------------------------------------------- |
| Docker Engine 26+ with Compose v2  | Docker Desktop on Windows/macOS, or Docker Engine on Linux |
| Git                                | To clone the repository                                    |
| A Google account                   | Only if you serve files from Google Drive (the default)    |
| 1 vCPU, 1 GB RAM, a few GB of disk | Minimum for the full stack (app, PostgreSQL, Redis, Caddy) |

Node.js and pnpm are **not** needed on the host for a Docker deployment.

## 2. Get the code

```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
```

## 3. Create `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in at least the values below. Every variable is described in [Configuration](configuration.md).

| Variable            | What to put                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL`      | The URL people will open, e.g. `http://localhost:3000` or `https://files.example.com` |
| `NEXTAUTH_SECRET`   | Random string, at least 32 characters                                                 |
| `SHARE_SECRET_KEY`  | Another random string, at least 32 characters                                         |
| `ADMIN_EMAILS`      | Your email (comma-separated for several admins)                                       |
| `ADMIN_PASSWORD`    | The password you will sign in with (min 8 characters, avoid `$`)                      |
| `POSTGRES_PASSWORD` | Database password. **Required**: Compose refuses to start without it                  |
| `CRON_SECRET`       | Random string, at least 16 characters (scheduled jobs)                                |

Generate random secrets with either command:

```bash
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **There is no default admin password.** You choose it here. Admin email + password sign-in only works for emails listed in `ADMIN_EMAILS`.
>
> Avoid `$` in any `.env` value used by Docker Compose. Compose expands `$name` inside values, which silently changes them. See the [FAQ](FAQ.md#why-does-admin-login-fail-when-deploying-with-docker-compose-admin_password_hash).

Leave `GOOGLE_REFRESH_TOKEN` empty. The setup wizard obtains it in step 6.

## 4. Prepare Google Cloud

Skip this step if you will only use local storage, S3, WebDAV, or Dropbox.

Follow [Google Cloud Setup](google-cloud-setup.md) to:

1. enable the Google Drive API,
2. configure the OAuth consent screen and add yourself as a test user,
3. create a **Web application** OAuth client with the right redirect URIs.

Put the client ID and secret in `.env`:

```env
GOOGLE_CLIENT_ID="1234567890-xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
NEXT_PUBLIC_ROOT_FOLDER_ID="root"    # or a folder ID, see below
```

`NEXT_PUBLIC_ROOT_FOLDER_ID` is the Drive folder Zee-Index shows as its root. Use `root` for the whole drive, or the ID from a folder URL: in `https://drive.google.com/drive/folders/1AbCdEf...`, the ID is `1AbCdEf...`.

> `NEXT_PUBLIC_*` values are baked into the browser bundle at build time. After changing one, rebuild with `docker compose up -d --build`.

## 5. Start the stack

```bash
docker compose up -d --build
```

The first build takes a few minutes. Compose starts these services:

| Service        | Purpose                                                          | Exposed on       |
| -------------- | ---------------------------------------------------------------- | ---------------- |
| `zee-index`    | The application (Next.js, Node 22)                               | `127.0.0.1:3000` |
| `postgres`     | PostgreSQL 16: users, credentials, shares, logs, config          | `127.0.0.1:5432` |
| `redis`        | Redis 7: cache and rate limits (`volatile-lru`, 128 MB)          | internal only    |
| `caddy`        | Reverse proxy with automatic HTTPS                               | `80`, `443`      |
| `cron-monitor` | Calls the incident, storage and cleanup cron jobs on an interval | internal only    |
| `db-backup`    | Daily compressed `pg_dump` into `./backups`                      | internal only    |
| `duckdns`      | Optional DuckDNS IP updater (idles when not configured)          | internal only    |

Check that everything is healthy:

```bash
docker compose ps
docker compose logs -f zee-index
```

On start, the app container waits for PostgreSQL, creates the database if needed, applies all Prisma migrations, then starts the server. You should see `All migrations have been successfully applied` followed by `Ready`.

`curl http://localhost:3000/api/health` answers `{"status":"ok",...}` once the app is up. `google_drive` reports `unhealthy` until setup is finished, which is expected.

## 6. First-run setup

Until Google Drive is connected, every page redirects to `/setup`, and API routes answer `503`.

1. Find your **setup token**. It stops strangers from claiming a fresh instance.
   - If you set `SETUP_TOKEN` in `.env`, that is the token.
   - Otherwise it is derived from `NEXTAUTH_SECRET` and printed once in the app log:
     ```bash
     docker compose logs zee-index | grep -i "setup token"
     ```
2. Open `http://localhost:3000/setup` (or your domain).
3. Enter the setup token. Values already in `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_ROOT_FOLDER_ID`) are shown as "Already set in .env" and used by the server; the wizard only asks for the ones that are missing. Choose **Use different values** to override them. The client secret from `.env` never leaves the server.
4. Click the authorize button, choose your Google account, and accept the Drive permission.
5. When Google sends you back, the wizard exchanges the code for a refresh token and writes `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and `NEXT_PUBLIC_ROOT_FOLDER_ID` to `.env`.
6. Restart so the new values are read:
   ```bash
   docker compose up -d --build
   ```

If the wizard cannot write `.env`, it shows the values instead. Copy them into `.env` by hand and restart. In Docker, `.env` is bind-mounted into the container, and the app runs as uid 1001, so it can only write the file when uid 1001 is allowed to.

Once the app is configured, `/setup` is restricted to signed-in admins with 2FA verified (if enabled), so the setup token is no longer needed.

## 7. Sign in as admin

1. Open `/login`.
2. Enter an email from `ADMIN_EMAILS` and the `ADMIN_PASSWORD` you set.
3. Open **Admin** in the sidebar.

Recommended right away:

- Enable two-factor authentication for your account under **Profile**.
- Review **Admin → Security & Control**, for example to turn off guest login or hide file authors.
- Prefer `ADMIN_PASSWORD_HASH` (bcrypt) over a plaintext password on non-Compose deployments. See [Security](security.md#admin-accounts-and-passwords).

## 8. Next steps

- Put it on a real domain with HTTPS: [Deployment](deployment.md).
- Add Dropbox, S3/R2, WebDAV or local storage: [Storage Providers](storage-providers.md).
- Protect folders, create share links and file requests: [User & Admin Guide](user-guide.md).
- Understand roles, sessions and share link rules: [Security](security.md).
- Something not working? See the [FAQ & Troubleshooting](FAQ.md).
