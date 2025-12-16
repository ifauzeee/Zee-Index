<div align="center">
  <a href="https://github.com/ifauzeee/Zee-Index">
    <img src="https://cdn-icons-png.freepik.com/512/2991/2991248.png" alt="Zee-Index Logo" width="140" height="140">
  </a>

  <h1 align="center">⚡ Zee-Index</h1>

  <p align="center">
    <strong>The Ultimate Self-Hosted Google Drive CMS, Explorer & Media Streaming Platform</strong>
  </p>

  <p align="center">
    Transform your Google Drive into a professional portfolio website, media gallery, or enterprise file repository.<br>
    Featuring <strong>Shared Drive</strong> management, adaptive media streaming, multi-language support, and enterprise-grade security.
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
    <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-Glassmorphism-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Vercel_KV-Redis-red?style=for-the-badge&logo=redis&logoColor=white" alt="Vercel KV" />
  </div>
  <div align="center">
    <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
    <img src="https://img.shields.io/badge/i18n-EN_|_ID-green?style=for-the-badge&logo=google-translate&logoColor=white" alt="i18n" />
    <img src="https://img.shields.io/badge/Sentry-Monitoring-362D59?style=for-the-badge&logo=sentry&logoColor=white" alt="Sentry" />
  </div>
</div>

<br />

---

## 📚 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Key Features](#-key-features)
  - [Multi-Drive Management](#️-multi-drive-management)
  - [Enterprise-Grade Security](#️-enterprise-grade-security)
  - [Media Streaming](#-media-streaming)
  - [Built-in Tools](#️-built-in-tools)
  - [User Experience](#-user-experience)
- [🛠️ Technology Stack](#️-technology-stack)
- [📂 Project Architecture](#-project-architecture)
- [🚀 Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Local Development](#option-1-local-development)
  - [Docker Deployment](#option-2-docker-deployment)
  - [One-Click Vercel Deploy](#option-3-one-click-vercel-deploy)
- [⚙️ Configuration Reference](#️-configuration-reference)
- [📦 Deployment Guide](#-deployment-guide)
  - [Step 1: Google Cloud Setup](#step-1-google-cloud-platform-setup)
  - [Step 2: Database Setup](#step-2-database-setup-vercel-kv--upstash-redis)
  - [Step 3: Deploy Application](#step-3-deploy-to-your-platform)
  - [Step 4: Initial Configuration](#step-4-first-time-setup-wizard)
- [🖱️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [🔧 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🌟 Overview

**Zee-Index** is a modern, feature-rich Google Drive indexer and content management system built with Next.js 14. It transforms any Google Drive folder into a professional web interface, perfect for:

- 📁 **File Repositories** — Share documents, software, and resources with your team or community
- 🎬 **Media Libraries** — Stream videos and audio directly from Drive with subtitle support
- 🖼️ **Photo Galleries** — Showcase images in beautiful, responsive masonry layouts
- 📖 **Document Portals** — Host PDFs, e-books, and markdown documentation
- 🗂️ **Personal Cloud** — Your own private Dropbox/Google Drive alternative with enhanced features

### Why Choose Zee-Index?

| Feature             | Zee-Index                       | Traditional Drive Sharing |
| ------------------- | ------------------------------- | ------------------------- |
| Custom Branding     | ✅ Full customization           | ❌ Google branding only   |
| Password Protection | ✅ Per-folder passwords         | ❌ Link-only access       |
| Media Streaming     | ✅ Built-in players + subtitles | ⚠️ Basic preview only     |
| Search & Navigation | ✅ Advanced filters + shortcuts | ⚠️ Limited                |
| Multi-drive Support | ✅ Unified sidebar              | ❌ Switch between drives  |
| Offline Support     | ✅ PWA Installable              | ❌ Web only               |

---

## ✨ Key Features

### 🗂️ Multi-Drive Management

- **Unified Sidebar** — Combine multiple Personal Drives, Shared Drives, and Team Drives into a single navigation pane
- **Folder Aliases** — Rename folders in the UI without modifying Drive (e.g., `backup_v1_final` → `🗄️ Archives`)
- **Pinned Folders** — Quick access shortcuts for frequently used directories
- **Smart Favorites** — Bookmark important files and folders for instant access
- **No-Code Configuration** — Manage everything via the intuitive Admin Dashboard

### 🛡️ Enterprise-Grade Security

- **Password-Protected Folders** — Secure sensitive content with Bcrypt-hashed passwords
- **Share Link Controls** — Generate timed links (minutes to days) or session-based links (1 year)
- **Two-Factor Authentication** — Protect admin access with TOTP (Google Authenticator compatible)
- **Role-Based Access** — Configurable Guest, User, and Admin permission levels
- **Rate Limiting** — Built-in DDoS protection using Upstash Redis
- **Activity Logging** — Comprehensive audit trail for all user actions

### 🎬 Media Streaming

- **Adaptive Video Player** — Stream videos directly from Drive with:
  - Auto-detection of subtitles (`.srt`, `.vtt`)
  - Quality selection for optimal bandwidth
  - Resume playback from last position
  - Direct and Proxy streaming modes
  - Support for common codecs (H.264, VP9)

- **Universal Audio Dock** — Persistent audio player with:
  - Background playback while navigating
  - Playlist queue management
  - Mini-player controls in the header

- **E-Book Reader** — Native `.epub` support with:
  - Adjustable fonts and themes
  - Progress tracking
  - Dark mode support

- **Image Gallery** — High-performance lightbox with:
  - Masonry grid layouts
  - Zoom and pan controls
  - EXIF metadata display

- **PDF Viewer** — Full-featured document viewer with:
  - Page navigation and zoom
  - Text search within documents
  - Download and print options

### 🛠️ Built-in Tools

- **Code Editor** — Syntax highlighting for 20+ programming languages with save functionality
- **Image Editor** — Crop, resize, rotate, and apply filters directly in the browser
- **Markdown Viewer** — Beautiful rendering of `.md` files with GitHub-flavored markdown
- **Archive Inspector** — Preview contents of `.zip`, `.rar`, and other archive formats
- **File Request Links** — Create public upload portals for external users

### 🎨 User Experience

- **Progressive Web App (PWA)** — Install on desktop or mobile for native-like experience
- **Multi-Language Support** — Full internationalization (English & Indonesian)
- **Dark/Light Themes** — Automatic theme detection with manual toggle
- **Command Palette** — Spotlight-style quick actions (`Cmd/Ctrl + K`)
- **Keyboard Shortcuts** — Power-user navigation and file management
- **Drag & Drop Upload** — Intuitive file uploading with progress indicators
- **Real-time Notifications** — In-app alerts for background operations
- **Responsive Design** — Optimized for desktop, tablet, and mobile devices

---

## 🛠️ Technology Stack

Zee-Index leverages cutting-edge web technologies for optimal performance and developer experience:

| Layer              | Technology                        | Purpose                                   |
| ------------------ | --------------------------------- | ----------------------------------------- |
| **Framework**      | [Next.js 14](https://nextjs.org/) | App Router, Server Actions, Edge Runtime  |
| **Language**       | TypeScript (Strict Mode)          | Type safety across the entire codebase    |
| **Styling**        | Tailwind CSS + Framer Motion      | Responsive design with fluid animations   |
| **Components**     | Radix UI + shadcn/ui              | Accessible, unstyled component primitives |
| **State**          | Zustand + TanStack Query          | Client state and server data caching      |
| **Authentication** | NextAuth.js 4                     | Google OAuth + credentials provider       |
| **Database**       | Vercel KV / Upstash Redis         | Session storage, caching, feature flags   |
| **Validation**     | Zod                               | Runtime type validation for API contracts |
| **Media**          | Vidstack + Plyr                   | Modern video and audio player components  |
| **Monitoring**     | Sentry                            | Error tracking and performance monitoring |
| **API**            | Google Drive API v3               | File management and content delivery      |

---

## 📂 Project Architecture

Understanding the codebase structure will help you navigate and contribute effectively:

```
zee-index/
├── 📁 app/                          # Next.js App Router
│   ├── 📁 [locale]/                 # Internationalized routes (en/id)
│   │   ├── 📁 (main)/               # Main file browser layout
│   │   │   ├── 📁 folder/[folderId] # Dynamic folder views
│   │   │   ├── 📁 file/[fileId]     # File detail pages
│   │   │   └── 📁 storage/          # Storage analytics
│   │   ├── 📁 admin/                # Admin dashboard
│   │   │   ├── 📄 page.tsx          # Settings & configuration
│   │   │   └── 📁 logs/             # Activity audit logs
│   │   ├── 📁 login/                # Authentication pages
│   │   ├── 📁 setup/                # Initial setup wizard
│   │   └── 📁 request/              # File request upload portal
│   └── 📁 api/                      # API route handlers
│       ├── 📁 auth/                 # NextAuth endpoints
│       ├── 📁 drive/                # Google Drive operations
│       └── 📁 config/               # App configuration APIs
│
├── 📁 components/                   # React UI components
│   ├── 📁 file-details/             # File-specific viewers
│   │   ├── 📄 VideoPlayer.tsx       # Adaptive video streaming
│   │   ├── 📄 PDFViewer.tsx         # Document viewer
│   │   ├── 📄 CodeViewer.tsx        # Syntax-highlighted code
│   │   └── 📄 PreviewRenderers.tsx  # E-book, markdown, etc.
│   ├── 📁 ui/                       # Shared UI primitives
│   ├── 📄 FileBrowser.tsx           # Main file explorer
│   ├── 📄 Sidebar.tsx               # Navigation sidebar
│   ├── 📄 Header.tsx                # Top navigation bar
│   ├── 📄 CommandPalette.tsx        # Quick actions modal
│   └── 📄 GlobalAudioPlayer.tsx     # Persistent audio dock
│
├── 📁 lib/                          # Core utilities
│   ├── 📄 googleDrive.ts            # Drive API client wrapper
│   ├── 📄 authOptions.ts            # NextAuth configuration
│   ├── 📄 kv.ts                     # Redis database helpers
│   ├── 📄 store.ts                  # Zustand state stores
│   ├── 📄 ratelimit.ts              # Rate limiting config
│   └── 📄 utils.ts                  # Common utility functions
│
├── 📁 messages/                     # i18n translation files
│   ├── 📄 en.json                   # English translations
│   └── 📄 id.json                   # Indonesian translations
│
├── 📁 hooks/                        # Custom React hooks
├── 📁 types/                        # TypeScript type definitions
├── 📁 public/                       # Static assets
├── 📄 middleware.ts                 # Request middleware (auth, i18n)
├── 📄 Dockerfile                    # Container configuration
├── 📄 docker-compose.yml            # Multi-container orchestration
└── 📄 next.config.mjs               # Next.js configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** — [Download here](https://nodejs.org/)
- **pnpm** (recommended) or npm — `npm install -g pnpm`
- **Git** — [Download here](https://git-scm.com/)

You will also need:

- A **Google Cloud Project** with Drive API enabled ([Setup Guide](#step-1-google-cloud-platform-setup))
- A **Redis Database** (Vercel KV or Upstash) ([Setup Guide](#step-2-database-setup-vercel-kv--upstash-redis))

---

### Option 1: Local Development

Perfect for testing and customization before deployment.

#### 1. Clone the Repository

```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Configure Environment Variables

```bash
# Copy the example configuration file
cp .env.example .env.local

# Open and edit with your credentials
# See Configuration Reference section for details
```

#### 4. Start Development Server

```bash
pnpm dev
```

#### 5. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

> 💡 **First-time users:** You will be redirected to `/setup` to complete the initial configuration.

---

### Option 2: Docker Deployment

Ideal for self-hosted production environments.

#### Using Docker Compose (Recommended)

```bash
# 1. Clone and navigate to the project
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index

# 2. Configure your environment
cp .env.example .env
# Edit .env with your credentials

# 3. Build and start the container
docker-compose up -d --build
```

#### Using Docker CLI

```bash
# Build the image
docker build -t zee-index . \
  --build-arg NEXT_PUBLIC_ROOT_FOLDER_ID=your_folder_id \
  --build-arg NEXT_PUBLIC_ROOT_FOLDER_NAME=Home

# Run the container
docker run -d \
  --name zee-index \
  -p 3000:3000 \
  --env-file .env \
  --restart always \
  zee-index
```

#### Health Check

The container includes a health check endpoint at `/api/health`.

```bash
# Verify the container is running
docker ps
curl http://localhost:3000/api/health
```

---

### Option 3: One-Click Vercel Deploy

The fastest way to get started with zero configuration.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fifauzeee%2FZee-Index)

**During deployment:**

1. Vercel will prompt you to add a **Storage** integration
2. Select **Vercel KV** to automatically configure Redis
3. Complete the setup wizard at `/setup` after deployment

---

## ⚙️ Configuration Reference

All configuration is managed through environment variables. Copy `.env.example` to `.env` (or `.env.local` for development) and configure the following:

### 🔑 Required Variables

| Variable                     | Description                 | How to Obtain                                                                             |
| ---------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`           | OAuth 2.0 Client ID         | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET`       | OAuth 2.0 Client Secret     | Same as above                                                                             |
| `GOOGLE_REFRESH_TOKEN`       | Long-lived API access token | Generated automatically via `/setup` wizard                                               |
| `NEXT_PUBLIC_ROOT_FOLDER_ID` | Root folder to display      | From Drive URL: `drive.google.com/drive/folders/[THIS_ID]`                                |
| `NEXTAUTH_SECRET`            | Session encryption key      | Generate: `openssl rand -base64 32`                                                       |
| `NEXTAUTH_URL`               | Application URL             | `http://localhost:3000` or your production URL                                            |
| `KV_REST_API_URL`            | Redis connection URL        | Vercel KV or Upstash dashboard                                                            |
| `KV_REST_API_TOKEN`          | Redis authentication token  | Same as above                                                                             |
| `ADMIN_EMAILS`               | Admin user email(s)         | Comma-separated list: `admin@example.com,user@example.com`                                |
| `SHARE_SECRET_KEY`           | Share link signing key      | Generate: `openssl rand -hex 32`                                                          |

### 🎨 Optional Variables

| Variable                       | Description                  | Default                 |
| ------------------------------ | ---------------------------- | ----------------------- |
| `NEXT_PUBLIC_ROOT_FOLDER_NAME` | Display name for root folder | `Home`                  |
| `ADMIN_PASSWORD`               | Fallback admin password      | —                       |
| `STORAGE_LIMIT_GB`             | Visual storage quota (GB)    | Uses actual Drive quota |
| `STORAGE_WARNING_THRESHOLD`    | Storage alert threshold      | `0.90` (90%)            |

### 📧 Email Configuration (Optional)

Required for password reset and admin notifications.

| Variable     | Description                   | Example                            |
| ------------ | ----------------------------- | ---------------------------------- |
| `SMTP_HOST`  | SMTP server host              | `smtp.gmail.com`                   |
| `SMTP_PORT`  | SMTP server port              | `465`                              |
| `SMTP_USER`  | SMTP username                 | `your-email@gmail.com`             |
| `SMTP_PASS`  | SMTP password or app password | `your-app-password`                |
| `EMAIL_FROM` | Sender display name           | `Zee Index <no-reply@example.com>` |

### 🔔 Integrations (Optional)

| Variable                 | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `WEBHOOK_URL`            | Discord/Slack/Telegram webhook for notifications |
| `CRON_SECRET`            | Security key for scheduled task endpoints        |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN                        |

---

## 📦 Deployment Guide

Follow these steps to deploy Zee-Index to production.

### Step 1: Google Cloud Platform Setup

**Estimated time: 10 minutes**

1. **Create a Google Cloud Project**
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/)
   - Click **"Create Project"** and enter a name (e.g., "Zee-Index")
   - Wait for the project to be created

2. **Enable the Google Drive API**
   - Go to **APIs & Services** → **Library**
   - Search for **"Google Drive API"**
   - Click **Enable**

3. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **External** user type (unless using Google Workspace)
   - Fill in the required fields:
     - App name: `Zee-Index`
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `drive.readonly` and `drive` (for full access)
   - Add yourself as a test user

4. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Zee-Index Web Client`
   - Add Authorized redirect URIs:
     ```
     http://localhost:3000/setup
     http://localhost:3000/api/auth/callback/google
     https://your-domain.com/setup
     https://your-domain.com/api/auth/callback/google
     ```
   - Click **Create** and save your **Client ID** and **Client Secret**

---

### Step 2: Database Setup (Vercel KV / Upstash Redis)

**Estimated time: 5 minutes**

#### Option A: Vercel KV (Recommended for Vercel deployments)

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **KV**
4. Name your database and select a region
5. Environment variables will be automatically added to your project

#### Option B: Upstash Redis (For self-hosted / Docker)

1. Create an account at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the **REST URL** and **REST Token** from the dashboard
4. Add to your `.env` file:
   ```env
   KV_REST_API_URL=https://your-database.upstash.io
   KV_REST_API_TOKEN=your-token-here
   ```

---

### Step 3: Deploy to Your Platform

#### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Project Settings
4. Deploy!

#### Docker (VPS/Self-Hosted)

```bash
# Using docker-compose (recommended)
docker-compose up -d --build

# Or using Docker CLI
docker build -t zee-index .
docker run -d -p 3000:3000 --env-file .env zee-index
```

#### Other Platforms

Zee-Index supports any platform that runs Node.js 20+:

- **Railway** — `railway up`
- **Render** — Connect repo and deploy
- **DigitalOcean App Platform** — Connect repo and deploy
- **AWS/GCP/Azure** — Use the provided Dockerfile

---

### Step 4: First-Time Setup Wizard

After deployment, complete the initial configuration:

1. **Navigate to your application URL**
   - You will be automatically redirected to `/setup`

2. **Enter Google OAuth Credentials**
   - Input your Client ID and Client Secret

3. **Authenticate with Google**
   - Sign in with the Google account that owns the Drive folders
   - Grant the requested permissions

4. **Token Generation**
   - The system will generate and securely store your Refresh Token
   - You'll be redirected to the main application

5. **Access Admin Dashboard**
   - Navigate to `/admin` to configure additional settings
   - Set up protected folders, drive aliases, and branding

> ⚠️ **Important:** The setup page is only accessible when `GOOGLE_REFRESH_TOKEN` is not yet configured. After completion, it becomes inaccessible for security.

---

## 🖱️ Keyboard Shortcuts

Power users can navigate efficiently using these keyboard shortcuts:

| Shortcut           | Action                  | Context               |
| ------------------ | ----------------------- | --------------------- |
| `Cmd/Ctrl + K`     | Open Command Palette    | Global                |
| `/`                | Focus Search Bar        | File Browser          |
| `Space`            | Quick Look / Preview    | File Selected         |
| `Enter`            | Open File or Folder     | File Selected         |
| `Delete`           | Move to Trash           | File Selected (Admin) |
| `F2`               | Rename File             | File Selected (Admin) |
| `Esc`              | Close Modal / Deselect  | Global                |
| `Shift + Click`    | Select Range            | File List             |
| `Cmd/Ctrl + Click` | Toggle Selection        | File List             |
| `G` then `H`       | Navigate to Home        | Global                |
| `?`                | Show Keyboard Shortcuts | Global                |

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### ❌ "Failed to load data" or API Errors

**Cause:** Google API quota exceeded or invalid refresh token.

**Solution:**

1. Wait for quota reset (resets daily at midnight Pacific Time)
2. Re-run the setup wizard at `/setup` to generate a new token
3. Check Google Cloud Console for quota usage

#### ❌ "KV Error" or Database Connection Issues

**Cause:** Redis connection failed.

**Solution:**

1. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are correct
2. Check that your Redis instance is running
3. For Upstash, ensure the database is in an active region

#### ❌ "Forbidden" or Access Denied

**Cause:** User email not in admin list or folder permissions.

**Solution:**

1. Add email to `ADMIN_EMAILS` environment variable
2. Ensure the Google account has access to the Drive folders
3. Check folder sharing settings in Google Drive

#### ❌ Videos Won't Play

**Cause:** Codec not supported by browser.

**Solution:**

1. Try switching between **Direct** and **Proxy** streaming modes
2. For HEVC/x265 content, use a compatible browser (Safari) or transcode
3. Check that the video file is not corrupted

#### ❌ Setup Page Not Accessible

**Cause:** Application already configured.

**Solution:**

1. The setup page is only available when `GOOGLE_REFRESH_TOKEN` is empty
2. To reconfigure, remove the token from your environment variables
3. Redeploy or restart the application

### Getting Help

If you encounter issues not covered here:

1. 📝 Check existing [GitHub Issues](https://github.com/ifauzeee/Zee-Index/issues)
2. 🐛 [Create a new issue](https://github.com/ifauzeee/Zee-Index/issues/new) with:
   - Steps to reproduce
   - Error messages (from browser console or server logs)
   - Environment details (Node version, deployment platform)

---

## 🤝 Contributing

Contributions are warmly welcomed! Here's how you can help:

### Development Workflow

1. **Fork the Repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/Zee-Index.git
   cd Zee-Index
   ```

2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Install Dependencies**

   ```bash
   pnpm install
   ```

4. **Make Your Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

5. **Run Quality Checks**

   ```bash
   pnpm check:all  # Type check, lint, and format
   pnpm test       # Run test suite
   ```

6. **Commit Your Changes**

   ```bash
   git commit -m "feat: add amazing feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

7. **Push and Create PR**
   ```bash
   git push origin feature/amazing-feature
   ```
   Open a Pull Request with a clear description of your changes.

### Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something great together.

---

## 📜 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** with additional attribution requirements.

### Key Terms

- ✅ You may use, modify, and distribute this software
- ✅ You may use it for commercial purposes
- ⚠️ You MUST keep the source code open for any modifications
- ⚠️ You MUST retain the attribution notice on all user-facing pages:

  ```
  © 2025 All rights reserved - Muhammad Ibnu Fauzi
  ```

See the [LICENSE](LICENSE) file for the complete license text.

---

<div align="center">

## ⭐ Star This Project

If Zee-Index helps you, please consider giving it a star on GitHub!

[![GitHub stars](https://img.shields.io/github/stars/ifauzeee/Zee-Index?style=social)](https://github.com/ifauzeee/Zee-Index)

---

  <p>Crafted with ❤️ and ☕ by <a href="https://github.com/ifauzeee">Muhammad Ibnu Fauzi</a></p>

  <p>
    <a href="https://github.com/ifauzeee/Zee-Index/issues">Report Bug</a>
    ·
    <a href="https://github.com/ifauzeee/Zee-Index/pulls">Request Feature</a>
    ·
    <a href="https://zee-index.vercel.app/">Live Demo</a>
  </p>

</div>
