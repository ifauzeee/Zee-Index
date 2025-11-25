<div align="center">

  <a href="https://github.com/ifauzeee/Zee-Index">
    <img src="public/icon.png" alt="Zee-Index Logo" width="120" height="120">
  </a>

  <h1 align="center">Zee-Index</h1>

  <p align="center">
    <strong>The Ultimate Self-Hosted Google Drive Explorer</strong>
  </p>

  <p align="center">
    Transform your Google Drive into a high-performance, secure, and beautiful file-sharing platform.
    <br />
    Built with Next.js 14, Vercel KV, and Tailwind CSS.
  </p>

  <p align="center">
    <a href="https://zee-index.vercel.app/">View Live Demo</a>
    ·
    <a href="https://github.com/ifauzeee/Zee-Index/issues">Report Bug</a>
    ·
    <a href="https://github.com/ifauzeee/Zee-Index/pulls">Request Feature</a>
  </p>

  <div align="center">
    <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vercel-KV-black?style=for-the-badge&logo=vercel" alt="Vercel KV" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
    <img src="https://img.shields.io/badge/License-AGPLv3-red?style=for-the-badge" alt="License" />
  </div>
</div>

<br />

---

## ✨ Why Zee-Index?

Zee-Index allows you to expose your Google Drive files as a fast, static-like website without revealing your personal Google account access. It's perfect for sharing file collections, hosting public archives, or personal cloud storage access.

### 🚀 Key Features

| Category | Features |
| :--- | :--- |
| **⚡ Performance** | **Next.js 14 App Router** with aggressive **Redis Caching (Vercel KV)** for instant page loads. |
| **🎨 UI / UX** | Modern **Glassmorphism** design, **Dark/Light Mode**, Responsive Grid/List views, and **PWA** support. |
| **🔐 Security** | **2FA (Two-Factor Auth)**, Password-protected folders, Private folders, and **Role-based Access (Admin/User/Guest)**. |
| **📂 Management** | **Full CRUD**: Upload, Rename, Move, Delete, and Copy files directly from the UI. |
| **👁️ Previews** | Built-in players for **Video/Audio**, and viewers for **PDF, Office Docs, eBooks, Code, & Markdown**. |
| **🔗 Sharing** | Create **Time-bound Share Links**, **File Request** links (public upload), and passwordless access tokens. |
| **🛠️ Setup** | **Zero-Code Setup Wizard**: Configure your Google Drive credentials via a beautiful UI, no complex `.env` editing needed. |

---

## 📸 Screenshots

<details>
<summary><b>👁️ Click to view Interface Gallery</b></summary>
<br>

| **File Browser (Grid)** | **Dark Mode (List)** |
|:---:|:---:|
| ![Grid View](https://via.placeholder.com/400x250.png?text=Grid+View+Preview) | ![List View](https://via.placeholder.com/400x250.png?text=List+View+Preview) |

| **Admin Dashboard** | **Setup Wizard** |
|:---:|:---:|
| ![Admin Dash](https://via.placeholder.com/400x250.png?text=Admin+Dashboard) | ![Setup Wizard](https://via.placeholder.com/400x250.png?text=Setup+Wizard) |

</details>

---

## 🛠️ Installation & Deployment

### Option 1: One-Click Deploy (Recommended)

Deploy directly to Vercel. The **Setup Wizard** will handle the Google Drive connection for you after deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fifauzeee%2FZee-Index&env=GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,NEXT_PUBLIC_ROOT_FOLDER_ID,NEXT_PUBLIC_ROOT_FOLDER_NAME,NEXTAUTH_SECRET,SHARE_SECRET_KEY,KV_URL,KV_REST_API_URL,KV_REST_API_TOKEN,KV_REST_API_READ_ONLY_TOKEN)

**Post-Deployment Steps:**
1. Open your deployed Vercel URL.
2. You will be redirected to the **/setup** page.
3. Enter your Google Client ID & Secret (see [Google Cloud Setup](#google-cloud-setup)).
4. Click **"Authorize with Google"**.
5. Done! Your index is live.

### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ifauzeee/Zee-Index.git
   cd Zee-Index
   ```

2.  **Install dependencies**

    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables**
    Copy `.env.example` to `.env.local` and fill in the required fields.

    ```bash
    cp .env.example .env.local
    ```

4.  **Run the development server**

    ```bash
    pnpm dev
    ```

---

## ☁️ Google Cloud Setup

To use Zee-Index, you need a Google Cloud Project with Drive API enabled.

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project.
3.  Enable **Google Drive API**.
4.  Go to **Credentials** → **Create Credentials** → **OAuth Client ID**.
5.  Application type: **Web application**.
6.  **Authorized Redirect URIs**:
      - For Local: `http://localhost:3000/setup`
      - For Vercel: `https://your-project-name.vercel.app/setup`
7.  Copy **Client ID** and **Client Secret**.

---

## ⚙️ Environment Variables

Required variables to run the application.

| Variable | Description |
| :--- | :--- |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console. |
| `NEXT_PUBLIC_ROOT_FOLDER_ID` | The ID of the folder you want to share/index. |
| `NEXTAUTH_SECRET` | Random string for session encryption (generate with `openssl rand -base64 32`). |
| `SHARE_SECRET_KEY` | Random string for signing share links. |
| `KV_URL` | Vercel KV / Upstash Redis URL. |
| `ADMIN_EMAILS` | (Optional) Comma-separated list of emails for Admin access (e.g., `me@gmail.com`). |

> **Note:** `GOOGLE_REFRESH_TOKEN` is handled automatically by the **Setup Wizard** and stored in Vercel KV, but you can still add it to `.env` manually if you prefer "Hardcoded Config".

---

## 🛡️ Admin & Security Guide

### 👑 Becoming an Admin

Add your email to the `ADMIN_EMAILS` environment variable.
Once logged in, you will see the **Admin Dashboard** icon in the header.

### 🔐 Protected Folders

You can password-protect specific folders via the Admin Dashboard.

1.  Go to **Admin Dashboard** > **Security**.
2.  Enter the `Folder ID` and set a `Password`.
3.  Users will be prompted for credentials when accessing that folder.

### 📡 File Requests (Public Uploads)

Need someone to send you a file without giving them account access?

1.  Go to **Admin Dashboard**.
2.  Click **"Upload Request"** icon.
3.  Generate a public link. Files uploaded there go directly to your Drive.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📜 License

Distributed under the **AGPL-3.0** License. See `LICENSE` for more information.

---

<div align="center">
<p>Made with ❤️ by <a href="https://github.com/ifauzeee">Muhammad Ibnu Fauzi</a></p>
</div>