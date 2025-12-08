<div align="center">
  <a href="https://github.com/ifauzeee/Zee-Index">
    <img src="https://cdn-icons-png.freepik.com/512/2991/2991248.png" alt="Zee-Index Logo" width="130" height="130">
  </a>

  <h1 align="center">⚡ Zee-Index</h1>

  <p align="center">
    <strong>The Ultimate Self-Hosted Google Drive CMS, Explorer & Streaming Platform.</strong>
  </p>

  <p align="center">
    Transform your Google Drive into a professional portfolio website, media gallery, or file repository.<br>
    Features <strong>Shared Drive</strong> management, instant streaming, no UI limitations, and enterprise-grade security.
  </p>

  <div align="center">
    <a href="https://zee-index.vercel.app/">🔴 Live Demo</a>
    ·
    <a href="https://github.com/ifauzeee/Zee-Index/issues">🐛 Report Bug</a>
    ·
    <a href="https://github.com/ifauzeee/Zee-Index/pulls">✨ Request Feature</a>
  </div>

  <br />

  <div align="center">
    <img src="https://img.shields.io/badge/Next.js_14-App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Vercel_KV-Redis-red?style=for-the-badge&logo=redis&logoColor=white" alt="Vercel KV" />
    <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-Glassmorphism-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  </div>
</div>

<br />

---

## 📚 Table of Contents

- [Key Features (Deep Dive)](#-key-features-deep-dive)
  - [🗂️ Multi-Drive Management](#️-multi-drive-management-shared-drives)
  - [🛡️ Security & Protection](#️-security--protection-system)
  - [🎬 Multimedia & Streaming](#-multimedia--streaming)
  - [⚡ System & Maintenance](#-system--maintenance-features)
- [📱 PWA Installation](#-app-installation-pwa)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts-power-user)
- [🚀 Deployment Guide](#-complete-deployment-guide)
  - [Step 1: Google Cloud Setup](#step-1-google-cloud-api-setup)
  - [Step 2: Deploy to Vercel](#step-2-deploy-to-vercel)
  - [Step 3: Setup Wizard](#step-3-setup-wizard-auto-config)
- [⚙️ Environment Configuration](#️-environment-configuration-env)
- [⚠️ Security FAQ & Troubleshooting](#️-security-faq--troubleshooting-important)
- [📜 License](#-license)

---

## 🔥 Key Features (Deep Dive)

### 🗂️ Multi-Drive Management (Shared Drives)

Seamlessly consolidate multiple drive sources into one unified, elegant sidebar.

- **Mount Unlimited Drives:** Add Team Drives, Shared Drives, or folders belonging to other accounts as shortcuts.
- **Folder Aliases:** Rename long or complex drive folder names to something readable (e.g., _backup-2024-xyz_ -> "Work Backup").
- **UI Management:** No code changes needed. Admins can add/remove drive shortcuts directly from the Dashboard.

### 🛡️ Security & Protection System

- **Folder Locking (Password):** Secure sensitive folders.
  - _Smart Storage:_ Passwords are hashed (_Bcrypt_) in the database, never stored as plain text.
  - _Auto-lock:_ Folder access sessions automatically expire after a set time.
- **2FA (Google Authenticator):** A second layer of security for Admin logins using TOTP.
- **Rate Limiting:** Integrated anti-abuse system (Upstash Ratelimit) to prevent DDOS attacks or excessive downloading.
- **Guest Control:** Completely disable guest access if you want the site to be strictly private.

### 🎬 Multimedia & Streaming

- **Global Audio Dock:** A persistent audio player floating at the bottom. Music **keeps playing** even when navigating between different pages or folders. Supports playlist/queuing.
- **Smart Video Player:** Adaptive streaming player featuring:
  - **Auto Subtitles:** Detects `.srt` or `.vtt` files with matching filenames.
  - **Resume Playback:** Remembers where you left off.
  - **Quality Controls** and download options.
- **E-Book Reader:** Native `.epub` reader with a book-like experience (page/scroll modes).
- **In-Browser Editor:**
  - **Code Editor:** Text editor with syntax highlighting for 20+ programming languages.
  - **Image Editor:** Crop, rotate, and zoom images, then save (overwrite) directly back to Google Drive.

### ⚡ System & Maintenance Features

- **File Requests (Public Upload):** Generate a time-bound upload link. Allows external users to upload files without needing an account.
- **Automation (Cron Jobs):**
  - _Storage Check:_ Sends email alerts to the admin when Drive storage exceeds 90%.
  - _Weekly Report:_ Admin receives a weekly summary (number of files uploaded, downloaded, bandwidth, etc.).
- **Bulk Actions:** Zip Download (on-the-fly), Mass Delete, and Mass Move.

---

## 📱 App Installation (PWA)

Zee-Index is a **Progressive Web App (PWA)**. You can install it as a native-like application on your device.

- **Desktop (Chrome/Edge):** Click the "Install" icon on the right side of the browser URL bar.
- **iOS (iPhone/iPad):** Open in Safari -> Tap _Share_ -> Select _"Add to Home Screen"_.
- **Android:** Open in Chrome -> Tap the three-dot menu -> Select _"Install App"_.

---

## ⌨️ Keyboard Shortcuts (Power User)

Navigate Zee-Index just like your desktop File Explorer. Press `Shift` + `?` anytime to view this list.

| Key                                 | Function            | Description                                          |
| :---------------------------------- | :------------------ | :--------------------------------------------------- |
| <kbd>Cmd/Ctrl</kbd> + <kbd>K</kbd>  | **Command Palette** | Open global command menu for fast navigation/search. |
| <kbd>/</kbd>                        | **Search**          | Instantly focus the file search bar.                 |
| <kbd>Space</kbd>                    | **Quick Look**      | Open file preview without leaving the current view.  |
| <kbd>Delete</kbd>                   | **Delete**          | Move selected file/folder to trash.                  |
| <kbd>F2</kbd>                       | **Rename**          | Rename the currently selected file.                  |
| <kbd>Esc</kbd>                      | **Escape**          | Close modals, clear selection, or exit preview.      |
| <kbd>Shift</kbd> + <kbd>Click</kbd> | **Multi Select**    | Select multiple files in a range.                    |

---

## 🚀 Complete Deployment Guide

### Step 1: Google Cloud API Setup

This is required to allow Zee-Index to communicate with your Google Drive.

1.  Open [Google Cloud Console](https://console.cloud.google.com/). Create a **New Project**.
2.  Go to **APIs & Services > Library**. Search for **Google Drive API** and click **Enable**.
3.  Go to **Credentials > Create Credentials > OAuth Client ID**.
    - **Application Type:** Web Application.
    - **Name:** `Zee-Index Production`.
    - **Authorized Redirect URIs:**
      - (Local) `http://localhost:3000/setup`
      - (Prod) `https://YOUR-VERCEL-DOMAIN.vercel.app/setup` (Add this later after Vercel deployment).
4.  Copy the **Client ID** and **Client Secret**.

### Step 2: Deploy to Vercel

Deploy automatically without touching a single line of code.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fifauzeee%2FZee-Index&env=GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,NEXT_PUBLIC_ROOT_FOLDER_ID,NEXTAUTH_SECRET,SHARE_SECRET_KEY,ADMIN_EMAILS,KV_REST_API_URL,KV_REST_API_TOKEN,SMTP_HOST,SMTP_USER,SMTP_PASS,EMAIL_FROM)

**Crucial Step:** When setting up the project in Vercel, ensure you click **"Create"** under the **Storage (Database)** section to set up **KV (Redis)**.

### Step 3: Setup Wizard (Auto-Config)

1.  After deployment succeeds, open your website URL.
2.  The page will automatically redirect to `/setup`.
3.  Enter your **Client ID** and **Client Secret** again to verify.
4.  Click **Authorize**. Sign in with your main Google Drive account.
5.  Grant permissions. **Done!** The refresh token is now securely stored in the database.

---

## ⚙️ Environment Configuration (.env)

Besides the basics, here are the configurations for advanced features (Notifications):

| Variable                     | Description                         | Example                         |
| :--------------------------- | :---------------------------------- | :------------------------------ |
| `GOOGLE_CLIENT_ID`           | Required. Google Auth.              | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`       | Required. Google Auth.              | `GOCSPX-...`                    |
| `NEXT_PUBLIC_ROOT_FOLDER_ID` | Required. Main Root Folder ID.      | `1xZ...`                        |
| `NEXTAUTH_SECRET`            | Required. Session encryption.       | Random String.                  |
| `SHARE_SECRET_KEY`           | Required. Signed URL key.           | Random String.                  |
| `KV_...`                     | Required. Redis DB.                 | (Auto-filled by Vercel)         |
| `ADMIN_EMAILS`               | Admin email list (comma-separated). | `me@gmail.com,admin@site.com`   |
| **Email SMTP**               | **(Optional) For Weekly Reports**   |                                 |
| `SMTP_HOST`                  | SMTP Host.                          | `smtp.gmail.com`                |
| `SMTP_PORT`                  | SMTP Port.                          | `465` (SSL) or `587` (TLS)      |
| `SMTP_USER`                  | Sender Email.                       | `bot@zeedrive.com`              |
| `SMTP_PASS`                  | Password/App Password.              | `xxxx xxxx xxxx xxxx`           |
| `CRON_SECRET`                | Vercel Cron Job Token.              | Random String.                  |

---

## ⚠️ Security FAQ & Troubleshooting (Important!)

**Q: When I access a Protected Folder URL, the Folder ID is visible in the browser Address Bar. Is this safe?**

- Example: `https://zee-index.app/folder/1xZ3KKvKMPg5...`
- **Concern:** Can't someone copy `1xZ3KKvKMPg5...` and try to open it directly via `drive.google.com`?

**Answer:**
This is by design and safe, provided you follow the setup below:

1.  **Dual Layer Protection:** Zee-Index is purely a _frontend/interface_ layer. Security relies on the **Google Drive Permission Settings**.
    - **MANDATORY:** Ensure the folders you protect in Zee-Index have their permission set to **"Restricted"** in Google Drive (not "Anyone with the link").
    - If Restricted: Even if someone knows the ID, they **cannot open it** directly in Google Drive ("Access Denied").
    - Zee-Index can open it because the server uses your authenticated Admin credentials to fetch the data.

2.  **Why isn't the URL masked/hidden? (Technical Reason):**
    We previously attempted to mask folder IDs (e.g., rewriting the URL to `/protected-folder`). This feature was removed (refer to commit `a04023c`) due to a critical issue:
    - When a user is on the Password Entry page and hits **Refresh (F5)**, the Next.js server would return a **404 Not Found** error because the "masked" route does not physically exist on the server.
    - To ensure application stability and reliable routing, we retain the original dynamic routing structure.

**Q: I forgot the Folder Password?**

- Log in as Admin -> Go to **Dashboard** -> **Security Tab**. There, you can reset or remove the password for any protected folder.

---

## 📜 License

This project is licensed under the **AGPL-3.0 License**.

Copyright © 2024 **Zee-Index**. Built with the spirit of Open Source.

<br />

<div align="center">
  <p>Crafted with ❤️, ☕, and Next.js Magic by <a href="https://github.com/ifauzeee">Muhammad Ibnu Fauzi</a></p>
</div>
