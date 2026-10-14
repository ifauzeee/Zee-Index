# API Reference

Zee-Index exposes a JSON API under `/api`. The browser app uses the same API, so everything the UI does is available here.

- **Interactive docs:** `/api/docs` (Swagger UI) and `/api/docs/openapi` (OpenAPI JSON), generated from `lib/openapi/`. Open them while signed in.
- **Static spec:** [`openapi.yaml`](openapi.yaml), covering the main public, share, auth, admin and health endpoints. Preview it with `npx @redocly/cli preview-docs docs/api/openapi.yaml`, or import it into Postman or [editor.swagger.io](https://editor.swagger.io/).
- **Source:** every endpoint is a `route.ts` under [`app/api`](../../app/api).

- [Authentication](#authentication)
- [Access levels](#access-levels)
- [Errors, request IDs and rate limits](#errors-request-ids-and-rate-limits)
- [Endpoints](#endpoints)
- [Examples](#examples)

---

## Authentication

| Mechanism                          | Used for                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Session cookie `authjs.session-token` | Signed-in users. Obtained through NextAuth (`/api/auth/*`), i.e. the login page              |
| `share_token` query parameter      | Opening shared items (`/api/files`, `/api/download`, `/api/filedetails`, `/api/share/items/*`) |
| `access_token` query parameter, or the `folder_token_<id>` cookie | Protected folders unlocked with `POST /api/auth/folder`                     |
| `Authorization: Bearer <api key>`  | Programmatic access to public endpoints (see below)                                          |
| `Authorization: Bearer $CRON_SECRET` | `/api/cron/*`                                                                              |

**API keys** are 64 hex characters, created in **Admin → API keys**. A key stands in for a session on **public** endpoints, with its own rate limit (1000/min). `/api/download` requires the `files:read` permission. A key sees what an anonymous visitor sees: protected folders still need a token or share link. Endpoints that require a signed-in role (user, editor, admin) still need a session. See [Security → API keys](../security.md#api-keys).

All mutating endpoints need the session cookie, so call them from a browser session or pass the cookie explicitly.

## Access levels

| Level      | Meaning                                                                          |
| ---------- | -------------------------------------------------------------------------------- |
| **Public** | No sign-in needed. The route still applies root, private, protected-folder and share rules per item |
| **User**   | Signed-in, non-guest                                                             |
| **Editor** | `EDITOR` or `ADMIN`, and only inside folders the caller can open                 |
| **Admin**  | `ADMIN`                                                                          |
| **Cron**   | `Authorization: Bearer $CRON_SECRET`                                             |

A session waiting for its 2FA code counts as anonymous on public routes and gets `403` elsewhere.

## Errors, request IDs and rate limits

Errors are JSON:

```json
{ "error": "Human readable message" }
```

Validation errors may add `"details": [...]` (Zod issues). Typical statuses: `400` invalid input, `401` not signed in, `403` not allowed, `404` not found (also for items outside your roots), `413` body too large, `415` unsupported media type, `429` rate limited, `503` app not configured yet.

Every wrapped route answers with an `x-request-id` header. Send your own `x-request-id` to correlate with server logs.

Rate limits (fixed windows, per IP unless noted):

| Tier       | Limit          | Applies to                                                              |
| ---------- | -------------- | ----------------------------------------------------------------------- |
| `API`      | 500 / minute   | All `/api/*` (in the proxy), plus routes marked `API` below              |
| `ADMIN`    | 200 / minute   | All `/api/admin/*`                                                      |
| `AUTH`     | 20 / 5 minutes | Routes marked `AUTH` below, and sign-in (also per account)              |
| `DOWNLOAD` | 100 / hour     | `/api/download`                                                         |
| `API_KEY`  | 1000 / minute  | Requests with an API key, per key                                       |

A `429` response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`.

## Endpoints

### Files, folders and search

| Method | Endpoint                        | Access | Description                                                                 |
| ------ | ------------------------------- | ------ | --------------------------------------------------------------------------- |
| GET    | `/api/files`                    | Public | List a folder: `folderId`, `pageToken`, `share_token`, `access_token`        |
| GET    | `/api/filedetails`              | Public | Metadata of one file: `fileId`                                              |
| GET    | `/api/folderpath`               | Public | Breadcrumb path of a folder: `folderId`. Names of restricted ancestors are hidden |
| GET    | `/api/download`                 | Public | Stream or download: `fileId`, optional `share_token`, `access_token`, `preview=1`, `export=pdf`. Supports `Range` |
| GET    | `/api/search`                   | Public | Search Drive: `q`, `folderId`, `searchType` (`name` or `fullText`), filters `mimeType`, `modifiedTime`, `minSize` |
| GET    | `/api/search/global`            | Public | Search everything visible to the caller, including indexed document text    |
| POST   | `/api/search/index`             | Admin  | Index document contents for full-text search                                |
| GET    | `/api/archive-preview`          | User   | List the contents of a Drive ZIP file: `fileId`                             |
| GET    | `/api/metadata`                 | Public (API) | TMDB metadata for a video file name                                   |
| GET    | `/api/proxy-image`              | Public (API) | Fetch and resize an allow-listed Google image: `url`, `w`, `h`, `q`         |
| GET    | `/api/datausage`                | Public | Total storage used                                                          |
| GET    | `/api/storage-details`          | Public | Storage quota breakdown                                                     |
| GET    | `/api/manual-drives`            | Public (API) | Configured manual drives                                              |
| GET    | `/api/events`                   | User   | Server-sent events stream of activity                                       |
| GET    | `/api/og`                       | Public (API) | Open Graph image for link previews: `title` (max 120 characters)      |

### Editing (editors and admins)

| Method | Endpoint                        | Access | Description                                                     |
| ------ | ------------------------------- | ------ | --------------------------------------------------------------- |
| POST   | `/api/files/upload`             | Editor | Chunked upload: `?type=init` then `?type=chunk` with `Content-Range` |
| POST   | `/api/files/rename`             | Editor | Rename a Drive file                                             |
| POST   | `/api/files/move`               | Editor | Move a Drive file                                               |
| POST   | `/api/files/bulk-move`          | Editor | Move several Drive files                                        |
| POST   | `/api/files/update`             | Editor | Replace the content of a Drive file                             |
| PATCH  | `/api/files/update-media`       | Admin  | Replace an image after editing                                  |
| POST   | `/api/files/copy`               | Admin  | Copy a Drive file                                               |
| POST   | `/api/files/delete`             | Admin  | Delete a file permanently (all sources)                         |
| POST   | `/api/files/bulk-delete`        | Admin  | Delete several files permanently                                |
| GET    | `/api/files/[fileId]/revisions` | Admin  | Drive revision history                                          |
| POST   | `/api/folder/create`            | Admin  | Create a folder (Drive, Dropbox)                                |
| GET, POST, DELETE | `/api/trash`         | Admin  | List the Drive trash, restore items, delete them forever        |

### Sharing and file requests

| Method | Endpoint                     | Access | Description                                                       |
| ------ | ---------------------------- | ------ | ----------------------------------------------------------------- |
| POST   | `/api/share`                 | Admin  | Create a share link (`path`) or collection (`items`)              |
| GET    | `/api/share/list`            | Admin  | List share links                                                  |
| PATCH  | `/api/share/[id]`            | Admin  | Edit a link: expiry, login required, max uses, download, watermark |
| POST   | `/api/share/revoke`          | Admin  | Block a link immediately                                          |
| POST   | `/api/share/delete`          | Admin  | Delete a link                                                     |
| GET    | `/api/share/items/[shareId]` | Public | Items of a collection: `share_token`                              |
| POST   | `/api/share/track`           | Public (API) | Record a view (counted once per viewer per 10 minutes)     |
| POST, GET, DELETE | `/api/file-request` | Admin  | Create, list and delete file requests                             |
| GET    | `/api/file-request/[token]`  | Public | Details of a file request                                         |
| POST   | `/api/file-request/upload`   | Public | Upload into a file request (chunked, max 2 GiB per file)          |
| POST   | `/api/request-access`        | User (AUTH) | Ask an admin for access to a protected folder               |

### Authentication and account

| Method | Endpoint                     | Access | Description                                                     |
| ------ | ---------------------------- | ------ | --------------------------------------------------------------- |
| *      | `/api/auth/[...nextauth]`    | Public | NextAuth: sign-in, callbacks, session, CSRF, sign-out           |
| GET    | `/api/auth/me`               | Public | Current user (or `null`)                                        |
| GET    | `/api/auth/status`           | Public | Session status                                                  |
| POST   | `/api/auth/folder`           | Public (AUTH) | Unlock a protected folder with its password               |
| POST   | `/api/auth/local/unlock`     | Public (AUTH) | Unlock local storage                                      |
| GET    | `/api/auth/local/check`      | Public (API) | Is local storage unlocked?                                 |
| POST   | `/api/auth/local/logout`     | Public (API) | Lock local storage again                                   |
| GET    | `/api/auth/2fa/status`       | User   | Is 2FA on?                                                      |
| POST   | `/api/auth/2fa/generate`     | User   | New secret and QR code                                          |
| POST   | `/api/auth/2fa/verify`       | User (AUTH) | Confirm a code and enable 2FA                              |
| POST   | `/api/auth/2fa/disable`      | User (AUTH) | Disable 2FA (requires a code)                              |
| POST   | `/api/auth/2fa/verify-login` | User, pending 2FA (AUTH, per IP and account) | Enter the code after sign-in |
| POST   | `/api/auth/profile/password` | User (AUTH, per IP and account) | Change own password (current + new, min 8) |

### Configuration and setup

| Method | Endpoint             | Access        | Description                                                  |
| ------ | -------------------- | ------------- | ------------------------------------------------------------ |
| GET    | `/api/config`        | Public (API)  | Public app settings and branding                             |
| GET    | `/api/config/public` | Public        | Guest login, author visibility, local storage lock flags     |
| GET    | `/api/setup/status`  | Public (API)   | Which Google values are already set in the environment (client ID, root folder ID, whether a secret is set; never the secret) |
| POST   | `/api/setup/finish`  | Public / Admin | Finish first-run setup. Client ID, secret and root folder fall back to the environment. Requires the setup token while unconfigured, admin afterwards |
| GET    | `/api/health`        | Public (API)  | `{"status","services":{"database","cache","google_drive"}}`  |
| GET    | `/api/docs`          | Signed in (API) | Swagger UI                                                 |
| GET    | `/api/docs/openapi`  | Signed in (API) | OpenAPI document                                           |

### Admin

| Method              | Endpoint                        | Description                                         |
| ------------------- | ------------------------------- | --------------------------------------------------- |
| GET, POST           | `/api/admin/config`             | Read and update admin settings                      |
| GET                 | `/api/admin/stats`              | Dashboard statistics                                |
| GET                 | `/api/admin/system-health`      | Database, Redis, Drive and error metrics            |
| GET                 | `/api/admin/analytics`          | Analytics data                                      |
| POST                | `/api/admin/analytics/track`    | Page-view tracking (public, `API` tier)             |
| GET                 | `/api/admin/logs`               | Activity log                                        |
| GET, DELETE         | `/api/admin/audit`              | Security audit trail; clear it                      |
| GET, PATCH          | `/api/admin/incidents`          | Incidents; acknowledge or resolve                   |
| POST                | `/api/admin/incidents/evaluate` | Run the incident rules now                          |
| GET, POST, DELETE   | `/api/admin/users`              | List, add and remove admins                         |
| GET, POST, DELETE   | `/api/admin/editors`            | List, add and remove editors                        |
| POST                | `/api/admin/invite`             | Invite a user by email (optional initial password, min 8) |
| GET, POST, DELETE   | `/api/admin/user-password`      | Which users have a password; set or remove one      |
| GET, POST, DELETE   | `/api/admin/user-access`        | Per-email access to protected folders               |
| GET, POST           | `/api/admin/access-requests`    | Pending access requests; approve or deny            |
| GET, POST, DELETE   | `/api/admin/protected-folders`  | Folder passwords                                    |
| GET, POST, DELETE   | `/api/admin/manual-drives`      | Manual drives                                       |
| GET                 | `/api/admin/drives/scan`        | List shared drives the Drive account can see        |
| POST                | `/api/admin/storage/test`       | Test the external storage provider connection       |
| GET, POST           | `/api/admin/api-keys`           | List keys; create one (raw key returned once)       |
| DELETE              | `/api/admin/api-keys/[id]`      | Revoke a key                                        |

### Cron

| Method | Endpoint                     | Description                                    |
| ------ | ---------------------------- | ---------------------------------------------- |
| GET    | `/api/cron/incident-monitor` | Evaluate alert rules and notify                |
| GET    | `/api/cron/storage-check`    | Warn when storage passes the threshold         |
| GET    | `/api/cron/activity-cleanup` | Delete old activity entries                    |
| GET    | `/api/cron/weekly-report`    | Email the weekly report                        |
| GET    | `/api/cron/content-index`    | Index pending documents for full-text search   |

## Examples

**List a folder:**

```bash
curl "http://localhost:3000/api/files?folderId=1AbCdEf..."
```

**List a local storage folder** (encode path IDs):

```bash
curl "http://localhost:3000/api/files?folderId=local-storage%3Adocs"
```

**Download with an API key:**

```bash
curl -H "Authorization: Bearer $ZEE_API_KEY" -OJ \
  "http://localhost:3000/api/download?fileId=1AbCdEf..."
```

**Create a share link** (admin session):

```bash
curl -X POST "http://localhost:3000/api/share" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<session>" \
  -d '{
    "path": "/folder/1AbCdEf...",
    "itemName": "My Folder",
    "type": "timed",
    "expiresIn": "7d",
    "loginRequired": false,
    "maxUses": 50
  }'
```

**Run a cron job:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/storage-check
```

**Health check:**

```bash
curl http://localhost:3000/api/health
```
