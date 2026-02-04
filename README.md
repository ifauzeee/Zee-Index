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
    Features <strong>Shared Drive</strong> management, <strong>Instant Navigation</strong>, enterprise security, and <strong>High-Performance Streaming</strong>.
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
    <img src="https://img.shields.io/badge/Next.js_16-App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Turbopack-Fast-blue?style=for-the-badge&logo=vercel&logoColor=white" alt="Turbopack" />
    <img src="https://img.shields.io/badge/Redis-Cache-red?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-Glassmorphism-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Docker-Optimized-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
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
  - [Installation (Local Pro Mode)](#installation-local-pro-mode)
  - [Docker Deployment](#docker-deployment)
- [⚙️ Configuration (.env)](#️-configuration-env)
- [📦 Deployment](#-deployment)
  - [Step 1: Google Cloud Setup](#step-1-google-cloud-setup)
  - [Step 2: Deploy to Vercel](#step-2-deploy-to-vercel)
- [🖱️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [⚠️ Security & Troubleshooting](#️-security--troubleshooting)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🌟 Key Features

Zee-Index allows you to build a powerful file system and media server on top of Google Drive, now faster and more secure than ever.

### ⚡ ultra-Fast & Responsive

- **Virtualized Rendering:** Built with `@tanstack/react-virtual`, enabling smooth scrolling through folders with **thousands of files** without lag.
- **Instant Visual Feedback:** Immediate "click" response with loading spinners on folders, files, and sidebar items, reducing perceived latency.
- **Global Progress Bar:** Visual top-loading bar moves between routes for a premium app-like feel.
- **Smart Prefetching:** Intelligently preloads folder contents when you hover over them.

### 🎬 Professional Media Streaming

- **Direct Stream (No Transform):** Optimized headers (`Cache-Control: no-transform`) ensure Google Drive streams video directly without re-encoding delays.
- **Universal Audio Dock:** Persistent audio player that continues playing while you navigate.
- **Adaptive Video Player:** Stream videos with auto-subtitle detection (`.srt`, `.vtt`) and quality selection.
- **Modern Gallery:** High-performance lightboxes for viewing images and PDFs.

### 🛡️ Enterprise-Grade Security

- **Recursive Folder Protection:** Locking a parent folder automatically protects all sub-folders and files deep within.
- **Admin "Pro Mode":** Simplified admin login with secure environment variable validation.
- **Role-Based Access:** Configurable Guest, User, and Admin roles.
- **Rate Limiting:** Built-in protection against abuse using Upstash Ratelimit.

### 🗂️ Multi-Drive Management

- **Unified Sidebar:** Consolidate multiple Personal Drives, Shared Drives, and Team Drives.
- **Aliases:** Rename folders in the UI without changing them in Drive (e.g., `backup_v1` -> `🗄️ Archives`).

### 🛠️ Built-in Tools

- **Code Editor:** Syntax highlighting for 20+ languages.
- **Data Usage Monitor:** Background calculation of drive storage usage with timeout handling.
- **File Request:** Create public upload links securely.
- **🌍 Multilingual:** English and Indonesian (i18n).

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16.1](https://nextjs.org/) (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Framer Motion
- **State:** Zustand, TanStack Query
- **Cache/DB:** Redis (Local Docker or Vercel KV)
- **Auth:** NextAuth.js
- **API:** Google Drive API V3

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **pnpm** (preferred)
- **Docker Desktop** (for local Redis/Pro Mode)
- **Google Cloud Project** (Drive API enabled)

### Installation (Local "Pro Mode")

This mode runs Redis in a lightweight Docker container for persistent caching while giving you the speed of `pnpm dev` (Hot Reload).

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
   Copy `.env.example` to `.env` and fill in your Google Cloud credentials.

   ```bash
   cp .env.example .env
   ```

4. **Start "Pro Mode" Dev Server:**
   This command starts Redis in the background and then launches Next.js.

   ```bash
   # Start Redis container
   pnpm redis:up

   # Start App (in new terminal)
   pnpm dev
   ```

   _To stop Redis later:_ `pnpm redis:down`

5. **Open App:**
   Go to [http://localhost:3000](http://localhost:3000).

### Docker Deployment

To build the production image for deployment:

```bash
# Build the optimized image
docker-compose build

# Run the container
docker-compose up -d
```

---

## ⚙️ Configuration (.env)

| Variable                     | Description                                               | Required? |
| :--------------------------- | :-------------------------------------------------------- | :-------: |
| `GOOGLE_CLIENT_ID`           | OAuth Client ID from Google Cloud Console                 |    ✅     |
| `GOOGLE_CLIENT_SECRET`       | OAuth Client Secret from Google Cloud Console             |    ✅     |
| `NEXT_PUBLIC_ROOT_FOLDER_ID` | The ID of the Google Drive folder to use as root          |    ✅     |
| `NEXTAUTH_SECRET`            | Random string for encryption (`openssl rand -base64 32`)  |    ✅     |
| `NEXTAUTH_URL`               | URL (e.g., `http://localhost:3000`)                       |    ✅     |
| `KV_REST_API_URL`            | Redis URL. Use `redis://localhost:6379` for local Docker. |    ✅     |
| `KV_REST_API_TOKEN`          | Redis Token. Leave blank if using local Redis.            |    ✅     |
| `ADMIN_EMAILS`               | Comma-separated list of admin emails                      |    ✅     |
| `ADMIN_PASSWORD`             | Password for fallback admin login                         |    ✅     |
| `SHARE_SECRET_KEY`           | Random key for signing share URLs                         |    ✅     |

---

## 📦 Deployment

### Step 1: Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Drive API**.
3. Create **OAuth 2.0 Credentials** (Web Application).
4. Add Redirect URI: `https://your-domain.com/setup` (or `http://localhost:3000/setup`).

### Step 2: Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fifauzeee%2FZee-Index)

**Note:** Choose **Vercel KV** integration during deployment for database.

---

## 🖱️ Keyboard Shortcuts

| Key            | Function          |
| :------------- | :---------------- |
| `Cmd/Ctrl + K` | **Command Bar**   |
| `/`            | **Search**        |
| `Space`        | **Quick Preview** |
| `Del`          | **Delete File**   |
| `Ctrl + A`     | **Select All**    |
| `F2`           | **Rename**        |

---

## ⚠️ Security & Troubleshooting

- **Login Failed:** Check `ADMIN_EMAILS` and `ADMIN_PASSWORD` in `.env`. Ensure no extra quotes are around the values.
- **Data Usage Timeout:** If calculating storage takes too long, the system will silence the error and retry in the background.
- **Redis Error:** Ensure `pnpm redis:up` is running if you are in local development.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork it
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch
5. Open a Pull Request

---

<div align="center">
  <p>Crafted with ❤️ by <a href="https://github.com/ifauzeee">Muhammad Ibnu Fauzi</a></p>
</div>
