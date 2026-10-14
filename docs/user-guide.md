# User & Admin Guide

What you can do in Zee-Index, from browsing to running the admin panel. For the rules behind access and sharing, see [Security](security.md).

- [Browsing](#browsing)
- [Previews and players](#previews-and-players)
- [Search](#search)
- [Favorites, tags and dashboard](#favorites-tags-and-dashboard)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Protected folders and local storage](#protected-folders-and-local-storage)
- [Your profile](#your-profile)
- [Uploading and managing files (editors and admins)](#uploading-and-managing-files-editors-and-admins)
- [Sharing (admins)](#sharing-admins)
- [File requests (admins)](#file-requests-admins)
- [The admin panel](#the-admin-panel)
- [Languages and installing as an app](#languages-and-installing-as-an-app)

---

## Browsing

- The sidebar lists every root: your Google Drive root, manual drives, **Local Storage**, and the external provider (S3, WebDAV or Dropbox).
- Switch between **list** and **grid** views, and sort by name, date or size from the toolbar.
- Breadcrumbs show where you are. Folders you cannot open show a lock instead of their contents.
- A folder containing `README.md` shows it, rendered as Markdown, under the listing.
- Long folders load more items as you scroll.
- Every file has its own page (`/folder/<folder>/file/<file>/<name>`) with previous/next navigation inside the folder, file details, and **Copy link** / **Download** buttons.

## Previews and players

| Type                    | Preview                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Video                   | Streaming player (VidStack): resume where you stopped, picture-in-picture, speed, subtitles                             |
| Subtitles               | `.srt` and `.vtt` next to the video with the same base name are picked up automatically; `.srt` is converted on the fly |
| Audio                   | Plays in a dock that keeps playing while you browse                                                                     |
| Images                  | Gallery with lightbox; admins can crop, rotate and resize Drive images                                                  |
| PDF                     | Built-in viewer (Drive PDFs use Drive's viewer)                                                                         |
| Code and text           | Monaco editor in read-only mode with syntax highlighting                                                                |
| Markdown                | Rendered and sanitized                                                                                                  |
| EPUB                    | Built-in reader. Scripts inside books never run                                                                         |
| Word, Excel, PowerPoint | Drive's viewer for Drive files. Office Online for public files elsewhere. Otherwise a download button                   |
| ZIP archives (Drive)    | List the contents without downloading                                                                                   |
| Movies and TV shows     | Poster, rating and cast from TMDB when `TMDB_API_KEY` is set                                                            |

## Search

- The search box in the header searches the current folder as you type.
- **Global search** (`Ctrl/⌘ + K`, the command palette) searches across everything you are allowed to see, including the text inside indexed documents.
- Document text is indexed by the `content-index` cron job (see [Deployment → Scheduled jobs](deployment.md#scheduled-jobs)). Admins can also trigger indexing with `POST /api/search/index`.
- Results never include items from folders you cannot open.

## Favorites, tags and dashboard

- **Favorites:** star a file or folder, then find it under **Favorites** in the sidebar.
- **Tags:** add your own tags to any file in its details panel. Tags are searchable.
- **Dashboard:** recent files, recent activity and storage usage.
- **Storage:** usage per source and the largest files.

## Keyboard shortcuts

In the file list:

| Key            | Action                                |
| -------------- | ------------------------------------- |
| `↑` / `↓`      | Move the selection                    |
| `Home` / `End` | First / last item                     |
| `Enter`        | Open                                  |
| `Backspace`    | Go to the parent folder               |
| `Space`        | Select / unselect (bulk mode)         |
| `F2`           | Rename (editors and admins)           |
| `Delete`       | Delete (admins)                       |
| `/`            | Focus the search box                  |
| `Esc`          | Clear the selection or close a dialog |
| Type letters   | Jump to the first item with that name |
| `Ctrl/⌘ + K`   | Command palette and global search     |

## Protected folders and local storage

- Opening a password-protected folder shows a lock screen. Enter the password to unlock that folder and everything inside it for your browser.
- Signed-in users (not guests) can click **Request access** instead. Admins are notified and can grant access to your email, after which you no longer need the password.
- If local storage has a password, you unlock it once. The unlock lasts 24 hours.
- A share link opens the shared item even inside a protected folder, without the password.

## Your profile

Under **Profile**:

- **Two-factor authentication:** scan the QR code with an authenticator app and confirm a code. From then on, sign-in asks for a code. Turning 2FA on or off signs you out so you sign in again.
- **Change password** (accounts with a password): enter the current password and a new one of at least 8 characters. All your sessions end.
- Sessions end after 7 days without use.

## Uploading and managing files (editors and admins)

| Action                     | Editor | Admin | Sources                                 |
| -------------------------- | ------ | ----- | --------------------------------------- |
| Upload files and folders   | ✅     | ✅    | All. Drag and drop or the upload button |
| Rename, move, edit content | ✅     | ✅    | Google Drive                            |
| Bulk move                  | ✅     | ✅    | Google Drive                            |
| Create folder              | —      | ✅    | Google Drive, Dropbox                   |
| Copy                       | —      | ✅    | Google Drive                            |
| Delete, bulk delete        | —      | ✅    | All. **Permanent**, not moved to trash  |
| Trash, revisions           | —      | ✅    | Google Drive                            |

- Editors can only act inside folders they can open themselves: not in protected folders they have not unlocked, and not outside the roots.
- Uploads are sent in 2 MB chunks and show progress. Dropping a folder recreates its structure.
- Size limits per source are listed in [Storage Providers](storage-providers.md#uploads-and-size-limits).

## Sharing (admins)

1. Select a file or folder (or several, for a **collection**) and click **Share**.
2. Pick an expiry (`1h`, `7d`, `30d`, ...) and the options you want: login required, max uses, prevent download, direct download, watermark text.
3. Copy the link. Collections open on a page listing their items.

Manage links under **Admin → Share links** (`/admin/share-links`): see views, edit options, revoke (blocks immediately) or delete.

What a link allows exactly is described in [Security → Share links](security.md#share-links).

## File requests (admins)

A file request is a public upload link into a folder you choose. Use it to collect files from people without accounts.

1. Open the target folder and click **Create File Request Link** in the folder toolbar. Give it a title and an expiry.
2. Send the link (`/request/<token>`). Visitors can upload files up to 2 GiB each, optionally into a subfolder.
3. Manage or delete requests from the admin panel.

## The admin panel

Open **Admin** in the sidebar (`/admin`).

| Tab / page                 | Contents                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Summary**                | Stats, system health (database, Redis, Drive), today's downloads, live activity                                                       |
| **Analytics**              | Page views, visitors, popular pages, devices, referrers, bandwidth                                                                    |
| **Admin** (users)          | Users and roles (admin, editor), invites, passwords, per-email folder access                                                          |
| **Security & Control**     | Guest login, author visibility, local storage password, manual drives, storage provider status and test, your 2FA, active share links |
| **Branding**               | App name, logo, favicon, primary color                                                                                                |
| `/admin/protected-folders` | Folder passwords                                                                                                                      |
| `/admin/share-links`       | All share links                                                                                                                       |
| `/admin/api-keys`          | API keys (shown once on creation)                                                                                                     |
| `/admin/logs`              | Activity log: downloads, uploads, shares, sign-ins                                                                                    |
| `/admin/audit`             | Security audit trail                                                                                                                  |
| `/admin/incidents`         | Alerts from the incident monitor; acknowledge or resolve                                                                              |

## Languages and installing as an app

- The interface is available in **English**, **Bahasa Indonesia** and **繁體中文 (zh-TW)**. Switch with the language button in the header. URLs carry the language (`/en/...`, `/id/...`, `/zh-TW/...`).
- Zee-Index is a Progressive Web App. Use your browser's **Install** option to add it to your home screen or desktop.
- The OpenAPI reference for developers is at `/api/docs` when signed in. See [API Reference](api/README.md).
