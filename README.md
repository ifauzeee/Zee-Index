<p align="center">
  <img src="https://seekicon.com/free-icon-download/google-drive_10.svg" alt="Google Drive Icon" width="140">
</p>

<h1 align="center">Zee-Index: The Ultimate Self-Hosted Google Drive Explorer</h1>

<p align="center">
  Transform your Google Drive into a high-performance, feature-rich, and visually appealing file-sharing website. Zee-Index is a powerful, self-hostable solution built with Next.js and TypeScript, offering granular control over your files with a clean and modern interface.
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14.x-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://next-auth.js.org/"><img src="https://img.shields.io/badge/NextAuth.js-4.x-000000?style=for-the-badge&logo=next-auth&logoColor=white" alt="NextAuth.js"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=for-the-badge" alt="License: AGPL-3.0"></a>
</p>

---

## 🌐 Live Demo

<p align="center">
  <img src="https://i.postimg.cc/fRx0hM58/image.png" alt="Zee-Index Preview" width="600"/>
</p>

<p align="center">
  <a href="https://zee-index.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Explore_Live_Demo-🚀-007BFF?style=for-the-badge&logo=vercel&logoColor=white" alt="Visit Live Demo">
  </a>
</p>
<p align="center">
  Atau scan QR code di bawah ini dengan ponsel Anda untuk membuka demo:
</p>
<p align="center">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://zee-index.vercel.app/" alt="Live Demo QR Code">
</p>

---

## 🤔 Why Zee-Index?

While the native Google Drive interface is functional, it lacks customization, public-sharing performance, and advanced access control. Zee-Index addresses these limitations by providing:

* **Superior Performance:** Leverages Next.js Server-Side Rendering (SSR) and a Redis/KV caching layer for faster content delivery.
* **Professional Presentation:** Clean, modern, and brandable interface suitable for portfolios, project deliveries, or personal archives.
* **Granular Security:** Multiple layers of access control, including admin lockdown and password-protected folders.
* **Complete Ownership:** Host it yourself, full control over your data and presentation. No third-party tracking or ads.

---

## ✨ Feature Showcase

### 📂 File Management & Viewing
* **Intuitive Navigation:** Breadcrumb-based UI for easy folder traversal.
* **Grid & List Views:** Toggle between visual grid and detailed list layouts.
* **Built-in Media Players:**
  * 🎞️ **Video:** Stream `mp4`, `webm`, and other supported video formats.
  * 🎵 **Audio:** Play `mp3`, `wav`, and more directly in the browser.
  * 🖼️ **Image Gallery:** Fullscreen gallery for images (`jpg`, `png`, `gif`).
* **Advanced Document Preview:**
  * 📄 **PDF Viewer**
  * ✍️ **Markdown Rendering**
  * 💻 **Code Viewer** (`js`, `py`, `css`, `html`, `txt`, etc.)

### 🔐 Security & Access Control
* **Admin Dashboard:** Restrict access to authorized admin Google accounts.
* **Private Folders:** Hidden from non-admin users.
* **Password Protection:** Secure folders with unique credentials.
* **Signed Share Links:** Time-sensitive secure links for individual files.

### ⚡ Performance & Optimization
* **Server-Side Rendering (SSR)**
* **Aggressive Caching:** Redis or Vercel KV to cache Google Drive API responses.
* **Optimized Builds:** Next.js production-ready code.

---

## 🏛️ Architectural Overview

1. **Frontend:** React + Next.js, styled with Tailwind CSS and Shadcn/ui.  
2. **Backend Logic:** Next.js API Routes act as secure intermediary to Google Drive API.  
3. **Authentication:** NextAuth.js with Google OAuth for admin logins.  
4. **Data Fetching:** Uses Google Drive API v3 with refresh token for metadata.  
5. **Caching:** Redis/Vercel KV for API response caching.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js:** v18+ ([Download](https://nodejs.org/))  
* **Package Manager:** `pnpm` (`npm install -g pnpm`)  
* **Google Cloud Account:** Access to [Google Cloud Platform](https://console.cloud.google.com/)  
* **Git**: Required for cloning the repository  

### Step 1: Clone the Repository
```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
````

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Google Cloud & API Setup

1.  Create Google Cloud Project.

2.  Enable **Google Drive API**.

3.  Configure OAuth Consent Screen (External, add `drive.readonly` scope).

4.  Create OAuth Client ID (Web Application) and set redirect URI:

    ```
    http://localhost:3000/api/auth/callback/google
    ```

5.  Obtain **Refresh Token** via [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).

### Step 4: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all credentials and configuration values.

### Step 5: Run the Application

```bash
pnpm dev
```

Open `http://localhost:3000`.

-----

## 🔑 Environment Variables

| Variable                       | Required | Description                          |
| :----------------------------- | :------: | :----------------------------------- |
| `GOOGLE_CLIENT_ID`             |    ✅    | Google OAuth Client ID               |
| `GOOGLE_CLIENT_SECRET`         |    ✅    | Google OAuth Client Secret           |
| `GOOGLE_REFRESH_TOKEN`         |    ✅    | Refresh token for Drive API          |
| `NEXT_PUBLIC_ROOT_FOLDER_ID`   |    ✅    | Main folder ID                       |
| `NEXT_PUBLIC_ROOT_FOLDER_NAME` |    ✅    | Display name for root folder         |
| `NEXTAUTH_SECRET`              |    ✅    | Random string for session encryption |
| `NEXTAUTH_URL`                 |    ✅    | App URL (`http://localhost:3000`)    |
| `ADMIN_EMAILS`                 | Optional | Comma-separated admin emails         |
| `PRIVATE_FOLDER_IDS`           | Optional | Comma-separated hidden folder IDs    |
| `SHARE_SECRET_KEY`             |    ✅    | Secret key to sign share links       |
| `PROTECTED_FOLDERS_JSON`       | Optional | JSON for folder password protection  |
| `KV_URL` / `REDIS_URL`         | Optional | Caching backend URL                  |
| `CRON_SECRET`                  | Optional | Secret for cron jobs                 |

-----

## ☁️ Deployment

Optimized for [Vercel](https://vercel.com/):

1.  Push to GitHub.
2.  Import repository into Vercel.
3.  Set environment variables.
4.  Update `NEXTAUTH_URL` to production URL and add OAuth redirect URI.
5.  Deploy & enjoy\!

-----

## 🚨 Troubleshooting

  * **403 Forbidden / permission\_denied**: Check Drive API enabled & correct scope.
  * **redirect\_uri\_mismatch**: Ensure `NEXTAUTH_URL` matches Google Cloud redirect URIs.
  * **Root folder not displaying**: Verify `NEXT_PUBLIC_ROOT_FOLDER_ID` and sharing settings.

-----

## 🙌 How to Contribute

1.  Fork the repository.
2.  Create feature branch: `git checkout -b feature/MyNewFeature`
3.  Commit changes: `git commit -m 'Add some AmazingFeature'`
4.  Push branch: `git push origin feature/MyNewFeature`
5.  Open Pull Request.

-----

## 📜 License

This project is licensed under the **GNU AGPL v3** with additional attribution requirements.

Any public use, modification, distribution, or deployment of this software must retain the following visible notice on all user-facing pages:

```
© 2025 All rights reserved - Muhammad Ibnu Fauzi
```

See the [LICENSE](https://www.google.com/search?q=./LICENSE) file for details.