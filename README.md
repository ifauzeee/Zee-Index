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
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
</p>

---

## 🤔 Why Zee-Index?

While the native Google Drive interface is functional, it lacks customization, performance for public sharing, and advanced access control. Zee-Index addresses these limitations by providing:

* **Superior Performance:** Leverages Next.js Server-Side Rendering (SSR) and a Redis/KV caching layer to deliver content significantly faster than the standard Drive web app.
* **Professional Presentation:** Presents your files in a clean, modern, and brandable interface, perfect for portfolios, project deliveries, or personal archives.
* **Granular Security:** Offers multiple layers of access control, from full admin lockdown to password-protected folders, which are not natively available in Google Drive for public links.
* **Complete Ownership:** You host it, you control it. No third-party tracking, no ads, and complete control over your data presentation.

## ✨ Feature Showcase

Zee-Index is packed with features designed to provide a comprehensive file browsing and management experience.

### 📂 File Management & Viewing
* **Intuitive Navigation:** A clean, breadcrumb-based UI for easy folder traversal.
* **Grid & List Views:** Toggle between visual grid and detailed list layouts.
* **Built-in Media Players:**
    * 🎞️ **Video:** Stream `mp4`, `webm`, and other supported video formats directly in the browser with a sleek video player.
    * 🎵 **Audio:** Play `mp3`, `wav`, and other audio files without needing to download them.
    * 🖼️ **Image Gallery:** View images (`jpg`, `png`, `gif`) in a beautiful, fullscreen gallery.
* **Advanced Document Preview:**
    * 📄 **PDF Viewer:** Read PDF documents seamlessly within the interface.
    * ✍️ **Markdown Rendering:** Renders `.md` files as formatted HTML, perfect for documentation or notes.
    * 💻 **Code Viewer:** Displays various code and text files (`js`, `py`, `css`, `html`, `txt`, etc.) with proper syntax highlighting.

### 🔐 Security & Access Control
* **Admin Dashboard:** The entire index can be restricted to a list of authorized admin Google accounts.
* **Private Folders:** Designate specific folders to be visible only to logged-in administrators.
* **Password Protection:** Secure individual folders with a unique username and password, ideal for sharing sensitive content with specific clients or groups.
* **Signed Share Links:** Generates secure, time-sensitive (optional) links for individual files, preventing unauthorized sharing.

### ⚡ Performance & Optimization
* **Server-Side Rendering (SSR):** Ensures fast initial page loads and excellent SEO.
* **Aggressive Caching:** Utilizes a Redis or Vercel KV backend to cache Google Drive API responses, dramatically reducing load times and avoiding API rate limits.
* **Optimized Builds:** Built with Next.js for highly optimized, production-ready code.

## 🏛️ Architectural Overview

Zee-Index is built on a modern web stack, designed for performance, security, and scalability.

1.  **Frontend:** The user interface is built with **React** and **Next.js**, styled using **Tailwind CSS** and **Shadcn/ui** for a responsive and modern look.
2.  **Backend Logic:** **Next.js API Routes** handle all server-side operations, acting as a secure intermediary between the client and the Google Drive API.
3.  **Authentication:** **NextAuth.js** manages user authentication, leveraging the Google OAuth provider to handle admin logins securely.
4.  **Data Fetching:** The backend communicates with the **Google Drive API v3** using a refresh token to fetch file and folder metadata.
5.  **Caching:** All API responses from Google Drive are cached in a **Redis/Vercel KV** store. This ensures subsequent requests for the same data are served almost instantly, improving performance and respecting API quotas.

## 🚀 Getting Started: A Detailed Guide

This comprehensive guide will walk you through setting up Zee-Index on your local machine.

### Prerequisites

* **Node.js:** v18.0.0 or later. [Download here](https://nodejs.org/).
* **Package Manager:** `pnpm` is recommended. Install via `npm install -g pnpm`.
* **Google Cloud Account:** A Google account with access to the [Google Cloud Platform](https://console.cloud.google.com/).
* **Git:** Required for cloning the repository.

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-ifauzeee/Zee-Index.git
cd Zee-Index
````

### Step 2: Install Project Dependencies

```bash
pnpm install
```

### Step 3: Google Cloud & API Credentials Setup

This is the most critical step. Follow carefully.

1.  **Create a Google Cloud Project:**

      * Go to the [Google Cloud Console](https://console.cloud.google.com/).
      * Click the project selector dropdown and click "New Project". Give it a name (e.g., "My Drive Index") and create it.

2.  **Enable the Google Drive API:**

      * In your new project, navigate to "APIs & Services" \> "Enabled APIs & services".
      * Click **+ ENABLE APIS AND SERVICES**.
      * Search for "Google Drive API" and click **Enable**.

3.  **Configure OAuth Consent Screen:**

      * Go to "APIs & Services" \> "OAuth consent screen".
      * Choose **External** and click Create.
      * Fill in the required fields: App name, User support email, and Developer contact information. Click "SAVE AND CONTINUE".
      * On the Scopes page, click "ADD OR REMOVE SCOPES". Find `.../auth/drive.readonly`, check it, and click Update. Then "SAVE AND CONTINUE".
      * Add your own email address as a Test User. Click "SAVE AND CONTINUE".

4.  **Create OAuth 2.0 Credentials:**

      * Go to "Credentials". Click **+ CREATE CREDENTIALS** and select "OAuth client ID".
      * For "Application type", select **Web application**.
      * Under "Authorized redirect URIs", click **+ ADD URI** and enter `http://localhost:3000/api/auth/callback/google`.
      * Click **CREATE**. You will be shown your **Client ID** and **Client Secret**. Copy these immediately.

5.  **Obtain a Refresh Token:**

      * Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
      * Click the gear icon (Settings) in the top right, check **"Use your own OAuth credentials"**, and paste your Client ID and Client Secret.
      * On the left, find and select the scope: `https://www.googleapis.com/auth/drive.readonly`.
      * Click **Authorize APIs**. Sign in with the Google account you wish to index.
      * Click **Exchange authorization code for tokens**. Your **Refresh token** will appear on the right. Copy it.

### Step 4: Configure Environment Variables

1.  Create your local environment file:
    ```bash
    cp .env.example .env.local
    ```
2.  Open `.env.local` and carefully fill in all the values obtained from the steps above.

### Step 5: Run the Application

```bash
pnpm dev
```

Navigate to `http://localhost:3000` in your browser. You should see your Google Drive files\!

## 🔑 Environment Variables Explained

Understanding these variables is key to configuring Zee-Index correctly.

| Variable | Required? | Description |
| :--- | :---: | :--- |
| `GOOGLE_CLIENT_ID` | ✅ Yes | Your Google Cloud OAuth 2.0 Client ID. |
| `GOOGLE_CLIENT_SECRET` | ✅ Yes | Your Google Cloud OAuth 2.0 Client Secret. |
| `GOOGLE_REFRESH_TOKEN` | ✅ Yes | The refresh token used to perpetually access the Google Drive API. |
| `NEXT_PUBLIC_ROOT_FOLDER_ID` | ✅ Yes | The ID of the Google Drive folder you want as the main entry point. |
| `NEXT_PUBLIC_ROOT_FOLDER_NAME`| ✅ Yes | A custom name for your root folder to be displayed in the UI. |
| `NEXTAUTH_SECRET` | ✅ Yes | A long, random string used by NextAuth.js for session encryption. |
| `NEXTAUTH_URL` | ✅ Yes | The full, absolute URL of your application. For local dev, it's `http://localhost:3000`. |
| `ADMIN_EMAILS` | Optional | Comma-separated list of Google emails that have admin privileges. |
| `PRIVATE_FOLDER_IDS` | Optional | Comma-separated list of folder IDs that are hidden from non-admin users. |
| `SHARE_SECRET_KEY` | ✅ Yes | A long, random string used to sign secure file-sharing links. |
| `PROTECTED_FOLDERS_JSON` | Optional | A JSON string to define username/password access for specific folders. |
| `KV_URL` / `REDIS_URL` | Optional | The connection URL for your Redis/Vercel KV instance for caching. Highly recommended for production. |
| `CRON_SECRET` | Optional | A secret key to secure cron job endpoints (e.g., for cache clearing). |

## ☁️ Deployment

This application is optimized for deployment on [Vercel](https://vercel.com/).

1.  Push your code to a Git repository (e.g., GitHub).
2.  Import the repository into Vercel.
3.  In the Vercel project settings, navigate to "Environment Variables" and add all the variables from your `.env.local` file.
4.  **Crucially:**
      * Update `NEXTAUTH_URL` to your production domain (e.g., `https://my-drive.vercel.app`).
      * Go back to your Google Cloud Console \> Credentials \> Your OAuth Client. Add your production URL (`https://my-drive.vercel.app/api/auth/callback/google`) to the "Authorized redirect URIs".
5.  (Optional but Recommended) Set up Vercel KV or an Upstash Redis database and add the corresponding `KV_URL` environment variables for production caching.
6.  Deploy\! Vercel will handle the build process automatically.

## 🚨 Troubleshooting Common Issues

  * **`403 Forbidden` / `permission_denied` errors:**
      * Ensure the Google Drive API is enabled in your Google Cloud project.
      * Check that you have selected the `drive.readonly` scope when generating the refresh token.
      * Ensure the Google account that owns the refresh token has at least "Viewer" access to the `ROOT_FOLDER_ID`.
  * **Authentication errors / `redirect_uri_mismatch`:**
      * Double-check that the `NEXTAUTH_URL` matches the URL in your browser exactly.
      * Ensure the URL is correctly added to the "Authorized redirect URIs" in your Google Cloud OAuth settings for both local and production environments.
  * **Root folder not displaying:**
      * Verify that `NEXT_PUBLIC_ROOT_FOLDER_ID` is correct and that the folder is shared appropriately (e.g., "Anyone with the link can view").

## 🙌 How to Contribute

Contributions are welcome and appreciated\!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/MyNewFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/MyNewFeature`)
5.  Open a Pull Request

## 📜 License

This project is distributed under the MIT License. See the `LICENSE` file for more information.