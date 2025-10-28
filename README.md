<p align="center">
<a href="https://github.com/ifauzeee/Zee-Index">
<img src="https://seekicon.com/free-icon-download/google-drive_10.svg" alt="Google Drive Icon" width="140">
</a>
</p>
<h1 align="center">Zee-Index: The Ultimate Self-Hosted Google Drive Explorer</h1>
<p align="center">
Transform your Google Drive into a modern, fast, and secure file-sharing website.
Zee-Index is a self-hostable solution built with Next.js and TypeScript, offering a professional interface with multilayered security controls and full data ownership.
</p>
<p align="center">
<a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14.x-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"></a>
<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
<a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
<a href="https://next-auth.js.org/"><img src="https://img.shields.io/badge/NextAuth.js-4.x-000000?style=for-the-badge&logo=next-auth&logoColor=white" alt="NextAuth.js"></a>
<a href="./LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=for-the-badge" alt="License: AGPL-3.0"></a>
</p>
<h2 align="center">🌐 Live Demo</h2>
<p align="center">
<img src="https://i.postimg.cc/fRx0hM58/image.png" alt="Zee-Index Preview" width="600"/>
</p>
<p align="center">
<a href="https://zee-index.vercel.app/" target="_blank">
<img src="https://img.shields.io/badge/Explore_Live_Demo-🚀-007BFF?style=for-the-badge&logo=vercel&logoColor=white" alt="Visit Live Demo">
</a>
</p>

---

## Table of Contents

- [Why Zee-Index?](#why-zee-index)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
- [Environment Variables (.env)](#environment-variables-env)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Why Zee-Index?

Zee-Index addresses the limitations of the standard Google Drive interface by providing:

- **⚡ Superior Performance:** Built with **Next.js 14 (App Router)** and optimized with Vercel KV (Redis) caching for blazing-fast content delivery.
- **🔒 Multilayered Security:** Offers granular access control with **Admin roles**, private folders, password-protected folders (with **bcrypt hashing**), **Two-Factor Authentication (2FA)**, and secure **JWT-signed share links**.
- **🎨 Modern & Professional Interface:** A clean, responsive look using **Tailwind CSS** and **Shadcn/UI**, featuring smooth animations from **Framer Motion**.
- **👑 Full Ownership:** Being **self-hosted** gives you complete control over your data and functionality, free from third-party ads or tracking.

---

## Key Features

<details>
<summary><strong>📂 File Management & Preview</strong></summary>

- **Intuitive Navigation:** Directory navigation with breadcrumbs.
- **Customizable Views:** Adjustable Grid & List view options.
- **Internal Media Player:** Built-in player for videos (mp4, webm, mkv) and audio (mp3, wav).
- **Comprehensive Document Previews:** PDF Viewer, Office Documents, E-books (.epub), Markdown rendering, and code viewer with syntax highlighting.
- **Text Editor:** Edit text, code, and markdown files directly in the browser (**Admin-only**).
- **Favorites Feature:** Mark important files for quick access for each user.
- **Full File Actions (Admin):** Upload, Create Folder, Rename, Delete, Move, and Copy.
- **Bulk Actions (Admin):** Download multiple files as .zip, delete, or move multiple items at once.
</details>

<details>
<summary><strong>🔍 Advanced Search & Filtering</strong></summary>

- **Scoped & Global Search:** Search within the current folder locally or globally across the entire connected drive.
- **Content Filtering:** Filter searches by file name or file content.
- **Sorting Options:** Sort files by name, size, or modification date.

</details>

<details>
<summary><strong>🔐 Security & Access Control (Admin)</strong></summary>

- **Centralized Admin Dashboard:** Manage users, share links, and security settings from a single place.
- **Role Management:** Clear access distinction between **ADMIN** and **USER**.
- **Private Folders:** Hide sensitive folders from non-admin users.
- **Password-Protected Folders:** Secure folders with unique credentials stored safely using **bcrypt hashing**.
- **Two-Factor Authentication (2FA):** Enhance account security with TOTP-based 2FA.
- **Detailed Audit Log:** Monitor all critical activities such as uploads, downloads, deletions, and logins.

</details>

<details>
<summary><strong>🔗 Sharing & Collaboration (Admin)</strong></summary>

- **Secure Time-Bound Links:** Create secure share links with expiration times (seconds, minutes, hours, days).
- **Login Requirement:** Option to enforce login for users accessing the shared link.
- **Link Management Dashboard:** Monitor click counts, view active/expired links, and revoke access at any time.

</details>

---

## Tech Stack

| Category               | Technology                               |
| :--------------------- | :--------------------------------------- |
| **Framework**          | Next.js 14 (App Router)                  |
| **Language**           | TypeScript                               |
| **Styling**            | Tailwind CSS + Shadcn/UI + Framer Motion |
| **Authentication**     | NextAuth.js v4 (Google Provider)         |
| **Database & Caching** | Vercel KV / Redis                        |
| **API**                | Google Drive API v3                      |
| **State Management**   | Zustand                                  |
| **Validation**         | Zod                                      |
| **Deployment**         | Vercel                                   |

---

## Project Architecture

- **Frontend:** Built with **React** and **Next.js** (SSR), with interactivity managed by **Zustand**.
- **Backend (BFF):** **Next.js API Routes** act as a secure intermediary between the client and the Google Drive API. All secrets remain server-side.
- **Authentication:** The login flow is handled by **NextAuth.js**, which generates JWTs for session management.
- **Caching:** **Vercel KV** is extensively used to store sessions, tokens, admin lists, and cache API data (like folder hierarchy) to minimize latency.
- **Cron Jobs:** Scheduled maintenance tasks (e.g., weekly reports, storage checks) are configured via `vercel.json`.

---

## Getting Started

### Prerequisites

- Node.js v18+
- pnpm (`npm install -g pnpm`)
- Google Cloud Account
- Vercel & Upstash Account (for Vercel KV)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Google Cloud & API

1.  Create a new project in the Google Cloud Console.
2.  Enable the **Google Drive API**.
3.  Configure the **OAuth Consent Screen**.
4.  Create **OAuth 2.0 Client ID** credentials.
5.  Add the authorized redirect URIs:
    - For development: `http://localhost:3000/api/auth/callback/google`
    - For production: `https://yourdomain.com/api/auth/callback/google`
6.  Copy the **Client ID** & **Client Secret**.
7.  Use the **OAuth 2.0 Playground** to obtain your **Refresh Token**.

### Step 4: Configure Environment Variables

Copy the example file and fill it with the credentials you obtained.

```bash
cp .env.example .env.local
```

### Step 5: Run the Application

```bash
pnpm dev
```

Open `http://localhost:3000` in your browser.

---

## Environment Variables (.env)

| Variable                       | Required | Description                                                                    |
| :----------------------------- | :------- | :----------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`             | ✅       | Your Google OAuth Client ID.                                                   |
| `GOOGLE_CLIENT_SECRET`         | ✅       | Your Google OAuth Client Secret.                                               |
| `GOOGLE_REFRESH_TOKEN`         | ✅       | The Refresh Token for Google Drive API access.                                 |
| `NEXT_PUBLIC_ROOT_FOLDER_ID`   | ✅       | The ID of the main folder in Google Drive to be displayed.                     |
| `NEXT_PUBLIC_ROOT_FOLDER_NAME` | ✅       | The name to be displayed for the root folder.                                  |
| `NEXTAUTH_SECRET`              | ✅       | A random string for NextAuth.js session encryption.                            |
| `NEXTAUTH_URL`                 | ✅       | The full URL of your application (e.g., `http://localhost:3000`).              |
| `ADMIN_EMAILS`                 | Optional | A list of initial admin emails (comma-separated).                              |
| `PRIVATE_FOLDER_IDS`           | Optional | IDs of folders to be hidden from non-admins (comma-separated).                 |
| `SHARE_SECRET_KEY`             | ✅       | A secret key (random string) for signing share link JWTs.                      |
| `KV_URL` & `KV_..._TOKEN`      | ✅       | Credentials for Vercel KV (automatically set by Vercel).                       |
| `SMTP_HOST`, `SMTP_PORT`, ...  | Optional | Email server credentials for notifications (reports, alerts).                  |
| `CRON_SECRET`                  | Optional | A secret key to secure cron job execution.                                     |
| `PROTECTED_FOLDERS_JSON`       | ❌       | **[DEPRECATED]** Do not use. Manage protected folders via the Admin Dashboard. |

---

## Deployment

1.  Upload your repository to GitHub.
2.  Import the repository into **Vercel**.
3.  Connect the **Vercel KV** database and set the environment variables in your Vercel project settings.
4.  Update `NEXTAUTH_URL` to your production URL.
5.  Add the production redirect URI in your Google OAuth credentials.
6.  **Deploy\!**

---

## Contributing

Contributions are highly welcome\! Please feel free to fork this repository, create a new branch for your feature, and submit a Pull Request.

1.  Fork the repository.
2.  Create your feature branch: `git checkout -b feature/AwesomeFeature`
3.  Commit your changes: `git commit -m 'feat: Add Awesome Feature'`
4.  Run the linter: `pnpm lint`
5.  Push to your branch: `git push origin feature/AwesomeFeature`
6.  Open a Pull Request.

---

## License

This project is licensed under the **GNU AGPL v3**. Any public use, modification, or distribution of this code must retain the original attribution and license.

See the [LICENSE](https://www.google.com/search?q=LICENSE) file for full details.
