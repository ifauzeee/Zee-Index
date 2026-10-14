# Security Model

How Zee-Index decides who can see what, how accounts and sessions work, and which protections are in place. To report a vulnerability, see [SECURITY.md](../SECURITY.md).

- [Roles](#roles)
- [Admin accounts and passwords](#admin-accounts-and-passwords)
- [Sign-in methods](#sign-in-methods)
- [Two-factor authentication](#two-factor-authentication)
- [Sessions](#sessions)
- [What non-admins can reach](#what-non-admins-can-reach)
- [Protected folders](#protected-folders)
- [Share links](#share-links)
- [Download links](#download-links)
- [API keys](#api-keys)
- [Rate limits](#rate-limits)
- [First-run setup](#first-run-setup)
- [HTTP security headers](#http-security-headers)
- [Other protections](#other-protections)
- [Where data is stored](#where-data-is-stored)
- [Dependency advisories](#dependency-advisories)
- [Hardening checklist](#hardening-checklist)

---

## Roles

| Role       | How someone gets it                                                       | Can do                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADMIN**  | Listed in `ADMIN_EMAILS`, or promoted in the **Admin** users tab          | Everything: all files, settings, users, shares, file requests, delete, copy, create folders, trash, logs                                            |
| **EDITOR** | Promoted in the **Admin** users tab                                       | Upload, rename, move, edit files, but **only in folders they can open themselves** (no protected folders without access, nothing outside the roots) |
| **USER**   | Signs in with Google, or with an account an admin created or invited      | Browse what is allowed, favorites, tags, 2FA, change own password, request access to protected folders                                              |
| **GUEST**  | "Continue as Guest" (can be turned off in **Admin → Security & Control**) | Browse public content only. Cannot request folder access                                                                                            |
| Anonymous  | Not signed in                                                             | Browse public content, open share links                                                                                                             |

A role is read from the database, the Redis role sets and `ADMIN_EMAILS` when someone signs in, and checked again on every request through the session version (see [Sessions](#sessions)). Changing someone's role signs them out everywhere.

## Admin accounts and passwords

There are two kinds of admin:

1. **Env admins**: emails in `ADMIN_EMAILS`. They sign in with the shared `ADMIN_PASSWORD_HASH` (bcrypt) or `ADMIN_PASSWORD` (plaintext, legacy). The hash wins when both are set.
2. **Panel admins**: promoted in the **Admin** users tab. They **cannot** use the env password. They sign in with their own password (set by an admin or through an invite), or with Google.

Every other account also has its own password, stored as a bcrypt hash in PostgreSQL.

- Minimum length: **8 characters**, everywhere (sign-up via invite, admin reset, self-service change).
- Changing your own password requires the current one. It is rate-limited per IP and per account.
- Setting, resetting or removing a password ends all of that user's sessions.

## Sign-in methods

| Method                          | Notes                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Email + password                | Rate-limited to 20 attempts per 5 minutes **per IP and per account**, so distributed guessing also stops. |
| Google ("Continue with Google") | Any Google account can sign in and becomes `USER`, unless its email is an admin or editor.                |
| Guest                           | No account. Can be disabled.                                                                              |

After sign-in, users are only redirected to paths on the same site (`safeCallbackUrl`). A `callbackUrl` pointing elsewhere goes to `/`.

## Two-factor authentication

- TOTP (any authenticator app), set up under **Profile** by scanning a QR code. Available to every signed-in user.
- The secret and the on/off flag live in PostgreSQL, so they cannot be lost when Redis evicts data.
- A code is accepted **once**. Replaying it within its 30-second window fails.
- Until the code is entered, a session is "pending 2FA": public pages treat it as anonymous, and every other route answers `403`.
- Turning 2FA on or off ends all of that user's sessions, including the current one, so they sign in again with the new setting.
- `/setup` on a configured instance requires an admin with 2FA verified.

## Sessions

- JWT in an `httpOnly`, `SameSite=Lax` cookie (`authjs.session-token`). `Secure` when `NEXTAUTH_URL` is `https`.
- **Lifetime:** a session ends after **7 days without use**. Active sessions are re-issued at most once a day and keep sliding.
- **Revocation:** each user has a `sessionVersion` in the database, copied into the JWT at sign-in. Every request compares it, using a cache of up to 30 seconds. Changing the role, password or 2FA, or deleting the user, increases the version, which ends all of that user's sessions within 30 seconds.
- If the database is briefly unreachable, existing sessions keep working rather than signing everyone out.
- Changing `NEXTAUTH_SECRET` ends every session.

## What non-admins can reach

Every API route and server-rendered page decides access from **the item itself**, never from the folder in the URL. The rule (`isAccessRestricted`) is the same for `/api/files`, `/api/download`, `/api/filedetails`, `/api/folderpath`, file pages, folder pages and editor actions:

1. **Roots.** The item must be inside `NEXT_PUBLIC_ROOT_FOLDER_ID`, a manual drive, local storage or the external provider. Anything else answers "not found", including folder names in breadcrumbs.
2. **Private folders.** Items under `PRIVATE_FOLDER_IDS` are invisible to non-admins.
3. **Protected folders.** Items under a password-protected folder need that folder's unlock token, an access grant for the user's email, or a share link for the item (see below).
4. **Local storage password**, if enabled.

Paths in local, WebDAV, Dropbox and S3 IDs are normalized before any check, so `..` cannot escape a protected folder or the storage root. Drive IDs are validated against `[A-Za-z0-9_-]` before they reach the Drive API.

Admins skip these checks.

## Protected folders

- Set in **Admin → Protected folders** with a password, stored as a bcrypt hash. Works for Drive, local, S3, WebDAV and Dropbox folders.
- Protection covers the folder **and everything below it**, at any depth.
- Unlocking sets a signed `folder_token_<id>` cookie. The password itself is never stored in the browser.
- **Access grants:** in the **Admin** users tab, specific emails can be allowed into a protected folder without the password.
- **Access requests:** signed-in users (not guests) can request access from the folder's lock screen. Admins get an email and approve or deny in the admin panel. Repeated requests for the same folder are de-duplicated for an hour.
- Editors are bound by the same rules. They cannot move a file out of a protected folder they cannot open.

## Share links

Share links are created by admins from a file, a folder, or a selection (a **collection**).

| Option           | Effect                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Expiry           | `1h`, `7d`, `30d`, and so on. The link stops working after that.                                                |
| Login required   | Only signed-in users can open it.                                                                               |
| Max uses         | Counted on the server, once per viewer (user or IP) per 10 minutes, so one person reloading does not use it up. |
| Prevent download | Preview only.                                                                                                   |
| Direct download  | The link downloads the file instead of showing the preview page.                                                |
| Watermark        | Text stamped on images and PDFs before they are sent.                                                           |

How a link grants access:

- It opens **exactly what was shared**: the file, or the folder and everything inside it, or each item of a collection. A link for one file does not open any other file, even in the same folder.
- It works **even inside a protected folder**. Sharing is how you give someone one file without the folder password.
- The restrictions travel with the link. Removing `share_token` from the URL does not unlock anything a visitor could not already open.
- Watermarked files are always rendered whole: `Range` requests get the full watermarked file. If watermarking fails, the request fails with `500` instead of sending the original.
- **Revoke** blocks a link immediately. **Edit** changes its options; the new options apply on the next request. **Delete** removes it.
- Signed with `SHARE_SECRET_KEY`. Rotating that key invalidates every share link.

## Download links

`/api/download` streams files from the storage source. File types that could run script in the browser (HTML, SVG, XML, ...) are always sent as `application/octet-stream` with `Content-Disposition: attachment`. Only safe media types are shown inline. Responses use `Cache-Control: private`. `ALLOWED_ORIGINS` can restrict cross-site use.

## API keys

Created in **Admin → API keys** (`/admin/api-keys`).

- Format: 64 hexadecimal characters, sent as `Authorization: Bearer <key>`.
- Shown **once** at creation. Only a bcrypt hash and the first 8 characters (for identification) are stored.
- Options: a name, permissions (`*`, `files:read`, `files:write`, `search`, `download`), and an optional expiry date. Keys can be revoked.
- Validation is cached for 5 minutes, keyed by a SHA-256 hash of the **full** key. Revoking a key clears its cache entry.
- Requests with a key get their own rate-limit tier (`API_KEY`, 1000 per minute per key).
- Header values like `x-api-key-*` or `x-auth-method` sent by clients are removed before the request reaches a route.

**Current scope.** A key replaces the session for **public** endpoints. It gets the same view as an anonymous visitor (no protected folders), with its own rate limit. `/api/download` additionally requires the `files:read` permission. Routes that need a signed-in role (user, editor, admin) still require a session, so a key cannot be used to upload, change settings or manage users yet.

## Rate limits

Fixed windows, stored in Redis and shared by all app instances.

| Tier       | Limit         | Applied to                                                                               |
| ---------- | ------------- | ---------------------------------------------------------------------------------------- |
| `API`      | 500 / minute  | Every `/api/*` request per IP (in the proxy), plus routes such as metadata and OG images |
| `ADMIN`    | 200 / minute  | Every `/api/admin/*` request per IP                                                      |
| `AUTH`     | 20 / 5 min    | Sign-in (per IP and per account), 2FA, password change, unlocks, access requests         |
| `DOWNLOAD` | 100 / hour    | Downloads per IP                                                                         |
| `API_KEY`  | 1000 / minute | Requests carrying an API key, per key                                                    |

`/api/health` and `/api/download` skip the proxy's `API` tier. Downloads use their own tier.

## First-run setup

Until Google Drive is connected, `/setup` and `/api/setup/finish` are reachable without signing in. To stop a stranger from pointing a fresh instance at their own Drive, finishing setup requires the **setup token**: `SETUP_TOKEN` from `.env`, or, when that is empty, a token derived from `NEXTAUTH_SECRET` and printed in the server log. After setup, the setup pages are admin-only with 2FA enforced.

## HTTP security headers

| Header                      | Value                                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | Per-request nonce for scripts, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, allow-listed image, media and frame hosts (Google, TMDB, Office Online) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                                                                                                                                                 |
| `X-Frame-Options`           | `DENY`                                                                                                                                                                                         |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                                                                                      |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                                                                                              |
| `Permissions-Policy`        | camera, microphone, geolocation, payment and USB disabled                                                                                                                                      |

The CSP is built in `proxy.ts` (the Next.js 16 name for middleware, running on Node.js). Route handlers do not set it.

## Other protections

- **Image proxy** (`/api/proxy-image`): only fetches from allow-listed Google hosts, only accepts JPEG, PNG, GIF, WebP and AVIF (checked by file signature, not by the declared type, so SVG cannot get through), limits size and pixel count, and times out stalled downloads.
- **Request bodies:** at most 25 MB reach the app (30 MB at Caddy), before any authentication, so large anonymous uploads cannot exhaust memory.
- **Markdown** is rendered with `rehype-sanitize`. **EPUB** books render in a sandboxed frame with scripts disabled. There is no `dangerouslySetInnerHTML` on user content.
- **Email templates** escape file names and other user-controlled text.
- **Activity and audit log:** sign-ins, failed sign-ins, downloads, uploads, shares and admin changes are recorded. The incident monitor raises alerts on bursts of failed sign-ins or downloads (see [Configuration](configuration.md#scheduled-jobs-limits-and-alerts)).
- **Containers** run as an unprivileged user (uid 1001). The app and PostgreSQL are only bound to `127.0.0.1`.

## Where data is stored

| Data                                                                            | Store                             |
| ------------------------------------------------------------------------------- | --------------------------------- |
| Users, roles, password hashes, 2FA, session versions                            | PostgreSQL                        |
| Share links, protected folders, access grants, API keys                         | PostgreSQL                        |
| Activity log, file index, app settings                                          | PostgreSQL                        |
| Admin/editor sets, manual drives, file requests, access requests, revoked links | Redis (persistent, never evicted) |
| Caches, rate-limit counters, short-lived tokens                                 | Redis (with TTL, evictable)       |
| Google refresh token and all other secrets                                      | `.env` only                       |

## Dependency advisories

`pnpm audit` runs in CI, and Dependabot alerts and CodeQL code scanning are enabled on the repository. Two advisories have no patched release, and are accepted in `pnpm.auditConfig.ignoreGhsas` in `package.json`:

| Advisory                                                                 | Package      | Why it is accepted                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `braces`     | Only used by build and dev tooling (Tailwind, ESLint, glob watchers) on patterns written in the repository. Not present in the production image.    |
| [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | `sprintf-js` | Pulled in by `argparse`, which `mammoth` only uses in its command-line tool. The app never loads it, and it is not present in the production image. |

Remove an entry as soon as a fixed version is available. When a new advisory appears, update the dependency or add an override rather than ignoring it.

## Hardening checklist

- [ ] Serve over HTTPS (Caddy does this automatically with a real domain), and set `NEXTAUTH_URL` to the `https://` URL.
- [ ] Use long random values for `NEXTAUTH_SECRET`, `SHARE_SECRET_KEY`, `CRON_SECRET`, `POSTGRES_PASSWORD`.
- [ ] Use `ADMIN_PASSWORD_HASH` outside Docker Compose. With Compose, use a long plaintext `ADMIN_PASSWORD` without `$`.
- [ ] Turn on 2FA for every admin.
- [ ] Disable guest login if the instance is not meant to be public.
- [ ] Keep `.env` readable only by you (`chmod 600 .env`). Never commit it.
- [ ] Enable Dependabot alerts and code scanning on your fork (enabled on the main repository).
- [ ] Back up PostgreSQL **and** the Redis volume (see [Deployment](deployment.md#backups-and-restore)).
- [ ] Keep the instance up to date (see [Deployment → Updating](deployment.md#updating)).
