# FAQ & Troubleshooting

- [Sign-in and accounts](#sign-in-and-accounts)
- [Setup and Google Drive](#setup-and-google-drive)
- [Docker and deployment](#docker-and-deployment)
- [Files, previews and uploads](#files-previews-and-uploads)
- [Sharing and access](#sharing-and-access)
- [Maintenance](#maintenance)

Still stuck? Check `docker compose logs zee-index` (search for the `x-request-id` of the failing request), then open an issue with the log lines. Report security problems privately, see [SECURITY.md](../SECURITY.md).

---

## Sign-in and accounts

### What is the default admin password?

There is none. You set it in `.env` before starting:

1. Put your email in `ADMIN_EMAILS`.
2. Set `ADMIN_PASSWORD` (min 8 characters) or `ADMIN_PASSWORD_HASH` (bcrypt):
   ```bash
   node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" 'your-password'
   ```
3. Restart: `docker compose up -d`.
4. Sign in at `/login` with that email and password.

### I forgot the admin password

Set a new `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`) in `.env` and run `docker compose up -d`. This works for emails in `ADMIN_EMAILS`. For other accounts, an admin sets a new password in the **Admin** users tab.

### Why does admin login fail when deploying with Docker Compose? (`ADMIN_PASSWORD_HASH`)

Docker Compose expands `$name` inside `.env` values. bcrypt hashes always contain `$` (`$2b$10$zh...`), so Compose silently corrupts them, and the hash never matches.

Fix, choose one:

1. Use a plaintext `ADMIN_PASSWORD` (min 8 characters, no `$`). Simplest with Compose.
2. Write every `$` in the hash as `$$`. Only works if Compose is the only thing reading `.env`. `pnpm dev` would see the literal `$$`.
3. Keep the plain hash on non-Compose setups (local dev, PaaS, `docker run --env-file`).

At startup, the app logs a warning when `ADMIN_PASSWORD_HASH` does not look like a valid bcrypt hash.

### An admin I added in the panel cannot sign in with `ADMIN_PASSWORD`

Expected. The env password only works for emails in `ADMIN_EMAILS`. Admins added in the panel sign in with Google, or with their own password: set one in the **Admin** users tab, or send them an invite.

### "Too many login attempts"

Sign-in is limited to 20 attempts per 5 minutes per IP **and** per account. Wait 5 minutes.

### I lost my 2FA device

Another admin can't turn off your 2FA from the UI. Reset it in the database (this also signs that user out everywhere):

```bash
docker compose exec postgres psql -U postgres -d zee_index -c \
  "UPDATE \"User\" SET \"twoFactorEnabled\"=false, \"twoFactorSecret\"=NULL, \"sessionVersion\"=\"sessionVersion\"+1 WHERE email='you@example.com';"
```

### Why was I signed out?

- You did not use the site for 7 days (sessions slide while you are active).
- Your password, role or 2FA setting changed. That ends all of your sessions by design.
- `NEXTAUTH_SECRET` changed.

### How do I turn off guest access?

**Admin → Security & Control → Disable guest login.**

---

## Setup and Google Drive

### Where is the setup token?

`/setup` asks for it while the app is not configured yet.

- If `SETUP_TOKEN` is set in `.env`, that is the token.
- Otherwise it is printed in the log once the app starts unconfigured:
  ```bash
  docker compose logs zee-index | grep -i "setup token"
  ```

### `redirect_uri_mismatch`

The URI in the error message is not in the OAuth client's **Authorized redirect URIs**. Add exactly that URI. You usually need `<origin>/setup`, `<origin>/en/setup` and `<origin>/api/auth/callback/google`. See [Google Cloud Setup](google-cloud-setup.md#4-create-the-oauth-client).

### "Access blocked" / `access_denied` during setup

The app is in **Testing** and your Google account is not a test user. Add it under **Google Auth Platform → Audience → Test users**.

### Setup says it could not write `.env`

The wizard shows the values instead. Copy `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and `NEXT_PUBLIC_ROOT_FOLDER_ID` into `.env` and run `docker compose up -d --build`. To let the wizard write it next time, make `.env` writable by uid 1001 (`sudo chown 1001 .env`), or accept doing it by hand.

### Every page shows "Setup Required" or "The OAuth client was not found"

The app cannot use Google Drive. Check:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` belong to an existing client and have no stray spaces or quotes.
- `GOOGLE_REFRESH_TOKEN` is set. Run `/setup` again if not.
- The **Google Drive API** is enabled in the project.
- You restarted after editing `.env`.

While Drive auth is failing, the file browser shows this screen for every root, local storage included. Local file pages and the API keep working.

### "Google Drive session expired"

The refresh token was revoked, or it expired: Google expires tokens of apps in **Testing** after 7 days. Run `/setup` again as an admin. Publish the app to **In production** to stop the 7-day expiry.

### How do I find a folder ID?

Open the folder in Google Drive. In `https://drive.google.com/drive/folders/1ABcDeFgHi...`, the ID is the part after `/folders/`. Use `root` for the whole drive.

### I changed `NEXT_PUBLIC_ROOT_FOLDER_ID` but nothing changed

`NEXT_PUBLIC_*` values are compiled into the app. Rebuild: `docker compose up -d --build`.

---

## Docker and deployment

### `POSTGRES_PASSWORD is required` / "Set POSTGRES_PASSWORD in .env"

Compose refuses to start without a database password. Set `POSTGRES_PASSWORD` in `.env`. Avoid `@ : / $` in it: it is inserted into the database URL.

### Local storage: `EACCES: permission denied, mkdir '/app/storage/.tmp'`

The app runs as uid 1001 and cannot write `./storage`:

```bash
sudo chown -R 1001:1001 storage
docker compose up -d zee-index
```

### The container keeps restarting

```bash
docker compose logs zee-index | tail -50
```

- `Startup failed: invalid environment variables`: the log lists each variable. Common ones: `NEXTAUTH_SECRET` or `SHARE_SECRET_KEY` shorter than 32 characters, `CRON_SECRET` shorter than 16, `NEXTAUTH_URL` not a URL.
- `prisma/migrations is missing from the image`: the image was built from an incomplete checkout. Run `git pull` and rebuild.
- Database errors: check `docker compose ps postgres`, and that `POSTGRES_PASSWORD` has not changed since the volume was created. The password is only applied when the volume is first initialized.

### `CRON_SECRET is not set` warning

Set `CRON_SECRET` to a random string of at least 16 characters and restart. Without it, scheduled jobs (alerts, storage checks, cleanup) are rejected.

### Uploads fail with `413 Request Entity Too Large`

A proxy in front of the app limits request bodies. Uploads are sent in 2 MB chunks, but allow at least 30 MB (nginx: `client_max_body_size 30m;`). See [Deployment](deployment.md#behind-another-reverse-proxy-or-cloudflare).

### HTTPS certificate is not issued

- `CADDY_SITE` must be the exact domain, and its DNS must point to the server.
- Ports 80 and 443 must be reachable from the internet.
- Look at `docker compose logs caddy`.

### How do I update?

```bash
git pull
docker compose up -d --build
```

Migrations run automatically. See [Deployment → Updating](deployment.md#updating).

---

## Files, previews and uploads

### Files I changed in Google Drive do not show up

Listings are cached for up to an hour. Changes made through Zee-Index refresh the cache immediately; changes made directly in Drive do not. To refresh now, clear the cache keys:

```bash
docker compose exec redis sh -c "redis-cli --scan --pattern 'zee-index:folder-*' | xargs -r redis-cli del; redis-cli --scan --pattern 'gdrive:file-details-v2:*' | xargs -r redis-cli del"
docker compose restart zee-index
```

Do **not** run `FLUSHALL`. Redis also stores admin and editor lists, manual drives, file requests and revoked share links.

### Video cannot be seeked

S3 and WebDAV files are streamed as a whole, without byte ranges. Drive, local and Dropbox files support seeking.

### Office files show "preview unavailable"

Office Online needs to fetch the file from the internet. That is impossible for `localhost` instances, for files in protected folders, and for files opened through a share link, since those URLs carry a token Zee-Index will not send to Microsoft. Download the file instead. Office files stored in Google Drive use Drive's own viewer.

### A file with special characters in its name does not open

Fixed in the current version: path-style IDs (local, S3, WebDAV, Dropbox) accept any file name. Update if you run an older version.

### WebDAV upload fails above 200 MB

WebDAV uploads are held in memory until complete and capped at 200 MB. Use S3/R2, Dropbox, Drive or local storage for larger files.

### Who can upload?

Editors and admins. Editors only in folders they can open themselves. Visitors without an account can upload through a [file request](user-guide.md#file-requests-admins) link.

---

## Sharing and access

### A share link says it is invalid

- It expired, it was revoked or deleted, or it reached its max uses.
- The link requires sign-in (`loginRequired`).
- `SHARE_SECRET_KEY` changed. That invalidates every link.

### A share link opens one file but not the files next to it

By design. A link opens exactly what was shared: one file, or a folder with its contents, or the items of a collection.

### Someone needs one file from a protected folder

Create a share link for that file. It opens without the folder password. Or grant their email access to the folder in the **Admin** users tab.

### What does "Hide author" do?

Owner and last-modifier names are removed from file details for everyone except admins, on the server.

---

## Maintenance

### How do I back up?

PostgreSQL is dumped daily to `./backups` by the `db-backup` service. Also back up the Redis volume, `.env` and `./storage`. See [Deployment → Backups and restore](deployment.md#backups-and-restore).

### How do I see what happened?

- **Admin → Summary / Analytics** for activity and health.
- `/admin/logs` for downloads, uploads and shares, `/admin/audit` for security events, `/admin/incidents` for alerts.
- `docker compose logs -f zee-index` for server logs. Set `LOG_LEVEL=debug` for more detail.
