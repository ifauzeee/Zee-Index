# Storage Providers

Zee-Index can show files from several sources at once. Each one appears as its own root in the sidebar and the file browser:

| Source                    | Enabled by                                                | Typical use                                    |
| ------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| **Google Drive**          | `GOOGLE_*` + `NEXT_PUBLIC_ROOT_FOLDER_ID` (via `/setup`)  | The main library; video streaming              |
| **Manual drives**         | `NEXT_PUBLIC_MANUAL_DRIVES` or Admin → Security & Control | Extra Drive folders or shared drives           |
| **Local storage**         | `NEXT_PUBLIC_ENABLE_LOCAL_STORAGE=true`                   | A directory on the server                      |
| **One external provider** | `STORAGE_PROVIDER=s3`, `webdav` or `dropbox`              | S3 / Cloudflare R2 / MinIO, Nextcloud, Dropbox |

Only one external provider can be active at a time. Google Drive and local storage can always be used alongside it.

- [Feature matrix](#feature-matrix)
- [Google Drive](#google-drive)
- [Manual drives](#manual-drives)
- [Local storage](#local-storage)
- [S3, Cloudflare R2 and MinIO](#s3-cloudflare-r2-and-minio)
- [WebDAV](#webdav)
- [Dropbox](#dropbox)
- [How IDs work](#how-ids-work)
- [Uploads and size limits](#uploads-and-size-limits)

---

## Feature matrix

| Capability                       | Google Drive | Local          | S3 / R2         | WebDAV                 | Dropbox           |
| -------------------------------- | ------------ | -------------- | --------------- | ---------------------- | ----------------- |
| Browse, preview, download        | ✅           | ✅             | ✅              | ✅                     | ✅                |
| Video seeking (HTTP Range)       | ✅           | ✅             | Whole file only | Whole file only        | ✅                |
| Upload                           | ✅ resumable | ✅ chunked     | ✅ multipart    | ✅ buffered (≤ 200 MB) | ✅ upload session |
| Create folder                    | ✅           | —              | —               | —                      | ✅                |
| Delete (permanent, admin only)   | ✅           | ✅             | ✅              | ✅                     | ✅                |
| Rename, move, copy, edit         | ✅           | —              | —               | —                      | —                 |
| Revisions, trash, content search | ✅           | —              | —               | —                      | —                 |
| Password-protected folders       | ✅           | ✅             | ✅              | ✅                     | ✅                |
| Share links and collections      | ✅           | ✅             | ✅              | ✅                     | ✅                |
| Office preview                   | Drive viewer | Office Online* | Office Online*  | Office Online*         | Office Online*    |

\* Office Online can only fetch files that are reachable from the internet without a token. Files in protected folders, files opened through a share link, and any instance on `localhost` show a download button instead. Download URLs that carry a token are never sent to Microsoft.

---

## Google Drive

The default source. Set up the OAuth client ([Google Cloud Setup](google-cloud-setup.md)), then run `/setup` ([Getting Started](getting-started.md#6-first-run-setup)).

- **Root.** `NEXT_PUBLIC_ROOT_FOLDER_ID` is what non-admins can see: that folder and everything below it, plus manual drives. IDs outside these roots answer "not found" for non-admins, even when guessed. Admins can open any ID the authorized account can read.
- **Private folders.** IDs in `PRIVATE_FOLDER_IDS` (JSON array) are hidden from everyone except admins.
- **Shared drives.** Add them as manual drives using the shared drive ID.
- **Caching.** Folder listings are cached for 1 hour, file details for 10 minutes and folder paths for 1 hour, in Redis plus a small in-process cache. Changes made through Zee-Index invalidate the affected folder. Changes made directly in Drive show up when the cache expires. To see them sooner, clear the cache (see the [FAQ](FAQ.md#files-i-changed-in-google-drive-do-not-show-up)).
- **Account.** Every Drive request runs as the Google account that completed `/setup`. To switch accounts, run `/setup` again as an admin.

## Manual drives

Extra Drive folders or shared drives, shown as additional roots.

- **From `.env`** (fixed, build-time): `NEXT_PUBLIC_MANUAL_DRIVES='[{"id":"0AbCdEf...","name":"Team Drive"}]'`
- **From the admin panel** (runtime): **Admin → Security & Control → Manual drives**. A drive added here can have a password. It then behaves like a protected folder.

IDs may only contain letters, digits, `_` and `-` (max 100 characters). Names are 1–120 characters. The account that ran `/setup` must have access to the drive.

## Local storage

Serves a directory on the server.

```env
NEXT_PUBLIC_ENABLE_LOCAL_STORAGE=true
LOCAL_STORAGE_PATH="storage"
NEXT_PUBLIC_LOCAL_STORAGE_NAME="Local Storage"
```

In Docker Compose, the host directory `./storage` is mounted at `/app/storage`. The app runs as uid 1001, so the directory must be writable by that uid, otherwise listings fail with `EACCES: permission denied, mkdir '/app/storage/.tmp'`:

```bash
mkdir -p storage
sudo chown -R 1001:1001 storage
docker compose up -d zee-index
```

Notes:

- Hidden entries (names starting with `.`) are not listed. `.tmp/uploads` holds in-progress uploads.
- File IDs look like `local-storage:folder/file.pdf`. Paths are normalized, so `..` cannot leave the storage directory.
- **Password for the whole root.** In **Admin → Security & Control**, turn on local storage authentication and set a password. Visitors then have to unlock local storage once; the unlock lasts 24 hours. Admins are never asked. The password is stored as a bcrypt hash.
- **Per-folder passwords** work as for Drive. Protect `local-storage:secret` and everything under it is protected.
- Creation dates come from the file system and may show as 1970 on file systems that do not record a birth time.

## S3, Cloudflare R2 and MinIO

```env
STORAGE_PROVIDER="s3"
STORAGE_S3_BUCKET="my-bucket"
STORAGE_S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"   # omit for AWS
STORAGE_S3_REGION="auto"                                              # R2: auto, AWS: e.g. ap-southeast-1
STORAGE_S3_ACCESS_KEY_ID="..."
STORAGE_S3_SECRET_ACCESS_KEY="..."
STORAGE_S3_FORCE_PATH_STYLE="true"                                    # R2 and MinIO need true
STORAGE_S3_ROOT_NAME="S3 Storage"
```

**Credentials.**

- **AWS:** create an IAM user or role with `s3:ListBucket` on the bucket and `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:AbortMultipartUpload` on `arn:aws:s3:::my-bucket/*`.
- **Cloudflare R2:** R2 → Manage API tokens → create a token with _Object Read & Write_ for the bucket. The endpoint is shown on the bucket's settings page.
- **MinIO:** create an access key with read/write on the bucket. Use the MinIO URL as the endpoint.

**Uploads** use S3 multipart. Browser chunks (2 MB) are grouped into 8 MB parts, so the server holds at most about one part per upload in memory and there is no server-side size cap. Uploads that fail, or sit idle for 15 minutes, are aborted so the bucket does not keep orphaned parts. As a safety net, also add a bucket lifecycle rule that aborts incomplete multipart uploads after a day.

**Folders.** S3 has no real folders. Zee-Index shows key prefixes ending in `/` as folders. "Create folder" is not supported for S3.

## WebDAV

```env
STORAGE_PROVIDER="webdav"
STORAGE_WEBDAV_URL="https://cloud.example.com/remote.php/dav/files/alice"
STORAGE_WEBDAV_USERNAME="alice"
STORAGE_WEBDAV_PASSWORD="app-password"
STORAGE_WEBDAV_BASEPATH="/Media"
STORAGE_WEBDAV_ROOT_NAME="Nextcloud"
```

- **Nextcloud / ownCloud:** use an app password (Settings → Security → Devices & sessions). The WebDAV URL is shown under Files → Settings.
- Only `STORAGE_WEBDAV_BASEPATH` and below is served. `..` in IDs cannot escape it.
- **Uploads** are buffered in server memory until the last chunk and then sent in one request. They are limited to **200 MB per file**, and abandoned uploads are dropped after 15 minutes.

## Dropbox

```env
STORAGE_PROVIDER="dropbox"
STORAGE_DROPBOX_APP_KEY="..."
STORAGE_DROPBOX_APP_SECRET="..."
STORAGE_DROPBOX_REFRESH_TOKEN="..."
STORAGE_DROPBOX_BASEPATH="/Zee"        # optional
STORAGE_DROPBOX_ROOT_NAME="Dropbox"
```

**Getting a refresh token:**

1. Create an app at [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps) with _Scoped access_. Choose _App folder_ or _Full Dropbox_.
2. Under **Permissions**, enable `files.metadata.read`, `files.content.read` and `files.content.write`, then submit.
3. Open this URL in a browser, replacing `APP_KEY`, and approve:
   ```
   https://www.dropbox.com/oauth2/authorize?client_id=APP_KEY&response_type=code&token_access_type=offline
   ```
4. Exchange the code shown for tokens:
   ```bash
   curl https://api.dropboxapi.com/oauth2/token \
     -d code=CODE_FROM_STEP_3 -d grant_type=authorization_code \
     -u APP_KEY:APP_SECRET
   ```
5. Put `refresh_token` from the response into `STORAGE_DROPBOX_REFRESH_TOKEN`. Access tokens are then refreshed automatically.

**Uploads** use Dropbox upload sessions, so chunks are forwarded as they arrive and large files work. Video seeking is supported.

---

## How IDs work

Every item has an ID, which also appears in URLs:

| Source        | Example ID                             |
| ------------- | -------------------------------------- |
| Google Drive  | `1AbCdEfGhIjKlMnOpQrStUvWxYz`          |
| Local storage | `local-storage:movies/Film (2024).mkv` |
| S3            | `s3:photos/2024/img.jpg`               |
| WebDAV        | `webdav:Documents/report.docx`         |
| Dropbox       | `dropbox:notes/todo.txt`               |

In URLs, IDs are percent-encoded (`local-storage%3Amovies%2FFilm%20(2024).mkv`), so a whole path stays one URL segment. Any file name is allowed for path-style IDs, including `&`, `+`, accents and CJK. Drive IDs must contain only letters, digits, `_` and `-`.

## Uploads and size limits

Uploads require the `EDITOR` or `ADMIN` role. Editors can only upload into folders they can open (see [Security](security.md#roles)).

| Limit                            | Value                       | Where                                        |
| -------------------------------- | --------------------------- | -------------------------------------------- |
| Browser chunk size               | 2 MB                        | `hooks/useUpload.ts`                         |
| Max request body seen by the app | 25 MB                       | `experimental.proxyClientMaxBodySize`        |
| Max request body at Caddy        | 30 MB                       | `Caddyfile` → `request_body`                 |
| WebDAV upload                    | 200 MB per file             | in-memory buffer                             |
| Public file request upload       | 2 GiB per file              | `FILE_REQUEST_MAX_BYTES`                     |
| Google Drive, local, S3, Dropbox | no app-side file size limit | chunks are streamed or stored as they arrive |

Every chunk must continue exactly where the previous one ended (`Content-Range`). Out-of-order or mismatched chunks are rejected with `400`.

If you put another reverse proxy in front (nginx, Cloudflare), allow request bodies of at least 30 MB. For nginx: `client_max_body_size 30m;`. Cloudflare's free plan caps bodies at 100 MB, so 2 MB chunks are fine.
