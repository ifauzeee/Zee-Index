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
    <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  </div>
</div>

<br />

---

## 📚 Table of Contents

- [🌟 Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation (Local)](#installation-local)
  - [Docker Setup](#docker-setup)
- [⚙️ Configuration (.env)](#️-configuration-env)
- [📦 Deployment](#-deployment)
  - [Step 1: Google Cloud Setup](#step-1-google-cloud-setup)
  - [Step 2: Deploy to Vercel](#step-2-deploy-to-vercel)
  - [Step 3: Setup Wizard](#step-3-setup-wizard)
- [🖱️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [⚠️ Security & Troubleshooting](#️-security--troubleshooting)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🌟 Key Features

Zee-Index allows you to build a powerful file system and media server on top of Google Drive.

### 🗂️ Multi-Drive Management
- **Unified Sidebar:** Consolidate multiple Personal Drives, Shared Drives, and Team Drives into one navigation pane.
- **Aliases:** Rename folders in the UI without changing them in Drive (e.g., `backup_v1_final` -> `🗄️ Archives`).
- **No Code Config:** Manage drives and folders entirely via the **Admin Dashboard**.

### 🛡️ Enterprise-Grade Security
- **Smart Folder Locking:** Password-protect specific folders using Bcrypt hashing.
- **Role-Based Access:** Configurable Guest, User, and Admin roles.
- **2FA Support:** Secure Admin login with Time-based One-Time Passwords (TOTP/Google Authenticator).
- **Rate Limiting:** Built-in protection against abuse and DDoS attacks using Upstash Ratelimit (Redis).

### 🎬 Powerful Media Streaming
- **Universal Audio Dock:** Persistent audio player that continues playing while you navigate. Supports playlists and background play.
- **Adaptive Video Player:** Stream videos directly from Drive with auto-subtitle detection (`.srt`, `.vtt`) and quality selection.
- **E-Book Reader:** Native `.epub` reader with adjustable fonts and themes.
- **Modern Gallery:** High-performance lightboxes for viewing images and PDFs.

### 🛠️ Built-in Tools
- **Code Editor:** View and edit code files with syntax highlighting for 20+ languages.
- **Image Editor:** Crop, resize, and rotate images directly in the browser and save changes back to Drive.
- **File Request:** Create public upload links for non-users to send files to your Drive securely.

---

## 🛠️ Tech Stack

Zee-Index is built with modern, high-performance web technologies:

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Framer Motion, Radix UI
- **Authentication:** NextAuth.js
- **Database:** Vercel KV (Redis) / Upstash Redis
- **State Management:** Zustand, React Query
- **Validation:** Zod
- **External API:** Google Drive API V3

---

## 📂 Project Structure

A quick overview of the codebase to help you navigate:

```bash
.
├── app/                  # Next.js App Router pages and API routes
│   ├── (main)/           # Main layout and file explorer routes
│   ├── admin/            # Admin Dashboard pages
│   ├── api/              # Backend API endpoints
│   ├── login/            # Authentication pages
│   ├── setup/            # Initial setup wizard
│   └── layout.tsx        # Root layout definition
├── components/           # Reusable UI components
│   ├── file-details/     # Components for specific file types (Audio, Video, etc.)
│   └── ...
├── lib/                  # Core business logic and utilities
│   ├── googleDrive.ts    # Google Drive API client and helpers
│   ├── authOptions.ts    # NextAuth configuration
│   ├── kv.ts             # Redis database connection
│   └── store.ts          # Zustand state stores
├── public/               # Static assets (images, fonts, icons)
└── middleware.ts         # Request handling, auth checks, and redirects
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+**
- **pnpm** (preferred) or npm
- A **Google Cloud Project** with Drive API enabled (see Deployment section)
- A **Vercel Account** (optional, but recommended for KV/Redis)

### Installation (Local)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ifauzeee/Zee-Index.git
   cd Zee-Index
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   *Fill in the required variables (see [Configuration](#configuration) below).*

4. **Run Development Server:**
   ```bash
   pnpm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

### Docker Setup

You can run Zee-Index in a container.

1. **Build the image:**
   ```bash
   docker build -t zee-index . --build-arg NEXT_PUBLIC_ROOT_FOLDER_ID=your_id --build-arg NEXT_PUBLIC_ROOT_FOLDER_NAME=Home
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 --env-file .env zee-index
   ```

---

## ⚙️ Configuration (.env)

These are the most important environment variables. See `.env.example` for the full list.

| Variable | Description | Required? |
| :--- | :--- | :---: |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console | ✅ |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud Console | ✅ |
| `NEXT_PUBLIC_ROOT_FOLDER_ID` | The ID of the Google Drive folder to use as root | ✅ |
| `NEXT_PUBLIC_ROOT_FOLDER_NAME` | Display name for the root folder (e.g., "Home") | No |
| `NEXTAUTH_SECRET` | Random string for session encryption (`openssl rand -base64 32`) | ✅ |
| `NEXTAUTH_URL` | Application URL (e.g., `http://localhost:3000`) | ✅ |
| `KV_REST_API_URL` | Connection URL for Vercel KV / Upstash Redis | ✅ |
| `KV_REST_API_TOKEN` | Auth token for Redis | ✅ |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses | ✅ |
| `SHARE_SECRET_KEY` | Random key for signing share URLs | ✅ |
| `STORAGE_LIMIT_GB` | Optional visual storage limit (e.g., `15`) | No |

---

## 📦 Deployment

### Step 1: Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable **Google Drive API**.
3. Create **OAuth 2.0 Credentials** (Web Application).
4. Set Authorized Redirect URIs:
   - `http://localhost:3000/setup` (for local dev)
   - `https://your-domain.com/setup` (for production)
5. Copy the **Client ID** and **Client Secret**.

### Step 2: Deploy to Vercel
The easiest way to deploy.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fifauzeee%2FZee-Index)

**Important:** During deployment, Vercel will ask to add a **Storage** integration. Select **Vercel KV** to automatically configure the database variables.

### Step 3: Setup Wizard
1. Visit your deployed site. You will be redirected to `/setup`.
2. Enter your Google Client ID and Secret.
3. Login with the Google Account that owns the Drive folders.
4. The system will generate and store your **Refresh Token** securely.

---

## 🖱️ Keyboard Shortcuts

| Key | Function |
| :--- | :--- |
| `Cmd/Ctrl + K` | **Command Bar:** Open global search and actions |
| `/` | **Search:** Focus search bar |
| `Space` | **Quick Look:** Preview selected file |
| `Del` | **Delete:** Move file to trash |
| `Shift + Click` | **Multi-Select:** Select range of files |
| `F2` | **Rename:** Rename selected file |
| `G then H` | **Go Home:** Navigate to root |

---

## ⚠️ Security & Troubleshooting

- **Protected Folders:** Zee-Index uses "frontend" protection. For true security, ensure the underlying Google Drive folders are set to **"Restricted"** access, not "Anyone with the link".
- **"Waiting for data" errors:** Usually means the Google API quota is exceeded or the Refresh Token is invalid. Re-run `/setup` to generic a new token.
- **KV Error:** If you see database errors, check `KV_REST_API_URL` and `KV_REST_API_TOKEN`.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create feature branch (`git checkout -b feature/NewFeature`).
3. Commit changes (`git commit -m 'Add NewFeature'`).
4. Push to branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📜 License

Distributed under the **AGPL-3.0** License. See `LICENSE` for more information.

<br />
<div align="center">
  <p>Crafted with ❤️ and ☕ by <a href="https://github.com/ifauzeee">Muhammad Ibnu Fauzi</a></p>
</div>
