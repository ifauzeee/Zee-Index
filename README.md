# 🚀 Zee Index - Modern Google Drive Indexer

**Zee Index** is an *open-source* web application for indexing and displaying files from Google Drive with a modern, fast, and feature-rich interface. Built on top of Next.js App Router, this app is not just a file viewer but also a powerful management tool with role-based access control, secure sharing features, and much more.

---

## ✨ Key Features

- **⚡ Fast Performance:** Built with Next.js and React, delivering a blazing-fast navigation experience.
- **📂 Modern File Explorer:** Two view modes (List & Grid) that are responsive and intuitive.
- **🎞️ Advanced Preview:**
  - Stream **Video & Audio** directly with the Plyr player.
  - Display **Images** in full resolution.
  - Render **PDF** directly in the browser.
  - *Syntax Highlighting* for multiple **programming languages**.
  - Beautifully formatted **Markdown (.md)** rendering.
- **🔐 Secure Authentication:** Full integration with **NextAuth.js** using Google Provider.
- **👑 Access Control (RBAC):**
  - Clear **Admin** and **User** roles.
  - **Private Folders:** Visible only to Admins.
  - **Protected Folders:** Can be secured with unique IDs and passwords.
- **🚀 File Management (Admin):**
  - **Upload Files:** With *drag-and-drop* support.
  - **Create & Move:** Create new folders and move files/folders with ease.
  - **Rename & Delete:** Manage files directly from the interface.
- **🔗 Secure Share Links:**
  - Generate **time-limited** share links (expire after a certain duration).
  - Option to **require login** for accessing the link.
- **⚙️ Admin Dashboard:**
  - Central panel to **manage all share links** (view, copy, and revoke).
  - **Dynamic Admin Management:** Add or remove admin emails in *real-time* without redeploying.
- **⚡ Loading Efficiency:**
  - **Infinite Scrolling:** Loads files progressively as users scroll down, ideal for large folders.
  - **Smart Caching:** Uses Next.js App Router Cache with **on-demand revalidation** (`revalidateTag`) to ensure fresh data after changes.
- **🔍 Quick Search:** Search files inside the current folder instantly.
- **🌓 Light & Dark Mode:** Theme customization stored in user preferences.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Animation:** [Framer Motion](https://www.framer.com/motion/)
- **Backend API:** Google Drive API
- **Database/Cache:** [Vercel KV](https://vercel.com/storage/kv) (Upstash Redis)
- **Schema Validation:** [Zod](https://zod.dev/)

---

## 🚀 Getting Started

Follow these steps to run this project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18.17.0 or later)
- `npm`, `yarn`, or `pnpm`

### 1. Clone the Repository

```bash
git clone [https://github.com/USERNAME/zee-index-nextjs.git](https://github.com/USERNAME/zee-index-nextjs.git)
cd zee-index-nextjs
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

This step is the most important. Copy the `.env.example` file into a new file named `.env.local`.

```bash
cp .env.example .env.local
```

Then, fill in all the variables inside `.env.local` with your own values.

| Variable                       | Description                                                  | How to Obtain                                                               |
| ------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`             | Client ID from your OAuth 2.0 credentials.                   | [Google Cloud Console](https://console.cloud.google.com/apis/credentials)   |
| `GOOGLE_CLIENT_SECRET`         | Client Secret from your OAuth 2.0 credentials.               | [Google Cloud Console](https://console.cloud.google.com/apis/credentials)   |
| `GOOGLE_REFRESH_TOKEN`         | Refresh Token for offline access to Google Drive.            | [Get from OAuth Playground](https://developers.google.com/oauthplayground/) |
| `NEXTAUTH_SECRET`              | Random secret key for NextAuth.                              | Run `openssl rand -hex 32` in terminal.                                     |
| `NEXTAUTH_URL`                 | Full URL of your app. For local: `http://localhost:3000`.    | -                                                                           |
| `NEXT_PUBLIC_ROOT_FOLDER_ID`   | Root folder ID in Google Drive you want to display.          | Check the folder URL in Google Drive.                                       |
| `NEXT_PUBLIC_ROOT_FOLDER_NAME` | Display name for the root folder (e.g., "Home").             | -                                                                           |
| `ADMIN_EMAILS`                 | List of admin emails (comma-separated) for initial setup.    | Your Google email(s).                                                       |
| `PRIVATE_FOLDER_IDS`           | List of folder IDs visible only to admins (comma-separated). | Optional.                                                                   |
| `PROTECTED_FOLDERS_JSON`       | JSON config for password-protected folders.                  | Optional, follow format in `.env.example`.                                  |
| `SHARE_SECRET_KEY`             | Random secret key for signing share tokens (JWT).            | Run `openssl rand -hex 32` in terminal.                                     |
| `KV_URL`                       | Connection URL for Vercel KV.                                | Vercel KV Dashboard.                                                        |
| `KV_REST_API_URL`              | REST API URL for Vercel KV.                                  | Vercel KV Dashboard.                                                        |
| `KV_REST_API_TOKEN`            | Token for read/write access to Vercel KV.                    | Vercel KV Dashboard.                                                        |
| `KV_REST_API_READ_ONLY_TOKEN`  | Token for read-only access.                                  | Vercel KV Dashboard.                                                        |

> **⚠️ IMPORTANT:** The `.env.local` file contains sensitive information. **NEVER** share or push this file to GitHub. It is already included in `.gitignore`.

### 4. Run the Application

Once all variables are set, start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see it running.

---

## ☁️ Deployment

The easiest way to deploy this Next.js app is using [Vercel Platform](https://vercel.com/new).

1. **Push to GitHub:** Make sure all your code is pushed to a GitHub repository.
2. **Import Project:** In Vercel, import your GitHub repository.
3. **Configure Environment Variables:** Go to `Settings` -> `Environment Variables` in your Vercel project and add all variables from your `.env.local` file. **Make sure to update `NEXTAUTH_URL` to your production URL**.
4. **Deploy:** Vercel will automatically deploy your project.

---

## 📜 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---

## 👨‍💻 Contact & Support

Made with ❤️ by **Muhammad Ibnu Fauzi**.

If you find a bug or have suggestions, please open an *issue* in this repository.