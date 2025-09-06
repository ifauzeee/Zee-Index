<!-- README.md -->
<!-- Project: Zee Index - Google Drive Indexer -->
<!-- Author: Muhammad Ibnu Fauzi -->
<!-- Created: 2025 -->

<div align="center">
  <img src="https://seekicon.com/free-icon-download/google-drive_10.svg" alt="Google Drive Icon" width="80" />
  <h1>Zee Index</h1>
  <p><strong>A modern, fast, and secure Google Drive file indexer built with Next.js</strong></p>
  <p>Effortlessly browse and share your Google Drive content with a sleek, responsive interface.</p>
  
  ![Next.js](https://img.shields.io/badge/Next.js-14-blue?logo=next.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-%2361DAFB?logo=react&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-%2338B2AC?logo=tailwind-css&logoColor=white)
  ![Google Drive API](https://img.shields.io/badge/API-Google_Drive-%234285F4?logo=google-drive&logoColor=white)
  ![License](https://img.shields.io/github/license/ibnufauzi13/Zee-Index?color=blue)

  [![Live Demo](https://img.shields.io/badge/Live_Demo-%F0%9F%9A%80-green?style=for-the-badge)](https://zee-index.vercel.app/)
</div>

---

## 📌 Overview

**Zee Index** is a powerful, open-source Google Drive indexer built with **Next.js 14**, **React Server Components**, and **Tailwind CSS**. It transforms your Google Drive into a beautiful, public-facing file browser with support for media playback, code viewing, file search, and secure access control.

Perfect for personal file hosting, team document sharing, or media libraries — all hosted on your Google Drive with zero bandwidth cost.

---

## 🌟 Features

✅ **Modern UI/UX** – Clean, responsive design powered by [shadcn/ui](https://ui.shadcn.com) and Tailwind CSS  
✅ **Media Support** – Built-in video, audio, and image preview with `plyr.js`  
✅ **Code Viewer** – Syntax highlighting for `.txt`, `.md`, `.js`, `.py`, and more using Prism.js  
✅ **Authentication** – Secure login via Google OAuth using `NextAuth.js`  
✅ **Admin Controls** – Role-based access (ADMIN/USER) and folder-level permissions  
✅ **Password-Protected Folders** – Optional password protection for sensitive content  
✅ **File Search & Filtering** – Real-time search across names and types  
✅ **Storage Analytics** – Visual breakdown of usage by file type  
✅ **Dark Mode** – Automatic system preference detection  
✅ **SEO Optimized** – Fast loading, metadata-rich pages for better indexing  

---

## 🛠️ Tech Stack

| Technology       | Purpose |
|------------------|--------|
| **Next.js 14**   | React framework with App Router and Server Components |
| **Tailwind CSS** | Utility-first CSS styling |
| **shadcn/ui**    | Reusable, accessible UI components |
| **Google Drive API** | File indexing and metadata retrieval |
| **NextAuth.js**  | Authentication and session management |
| **Zustand**      | State management |
| **Framer Motion**| Smooth animations and transitions |
| **Prism.js**     | Syntax highlighting for code files |
| **Plyr**         | Video and audio player |

---

## 🔧 Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Zee-Index.git
cd Zee-Index
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Google API credentials and settings:

```env
# === Google Drive API ===
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REFRESH_TOKEN="your-google-refresh-token"

# === Application Settings ===
NEXT_PUBLIC_ROOT_FOLDER_ID="your-root-folder-id"
NEXT_PUBLIC_ROOT_FOLDER_NAME="Home"
NEXTAUTH_SECRET="your-nextauth-secret" # Use: openssl rand -base64 32
NEXTAUTH_URL="https://yourdomain.com"

# === Admin & Access Control ===
ADMIN_EMAILS="admin1@gmail.com,admin2@gmail.com"
PRIVATE_FOLDER_IDS="folder-id-1,folder-id-2"
PROTECTED_FOLDERS_JSON='[{"id":"folder3","password":"secret123"}]'
```

> 🔐 **Tip**: Generate `NEXTAUTH_SECRET` using:
> ```bash
> openssl rand -base64 32
> ```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deployment

Deploy to **Vercel**, **Netlify**, or any Node.js hosting provider.

### Vercel (Recommended)

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and import the project.
3. Add all environment variables in the Vercel dashboard.
4. Deploy!

> ✅ Vercel automatically detects Next.js and configures the build process.

---

## 🔐 Security & Access Control

Zee Index supports multiple layers of security:

- **Admin Roles**: Defined by `ADMIN_EMAILS` in `.env`
- **Private Folders**: Only visible to admins (`PRIVATE_FOLDER_IDS`)
- **Password Protection**: JSON-configurable (`PROTECTED_FOLDERS_JSON`)
- **OAuth 2.0**: All users must sign in with Google
- **Secure Sessions**: Encrypted with `NEXTAUTH_SECRET`

---

## 📁 Folder Structure (Highlights)

```
Zee-Index/
├── app/                  # Next.js App Router
├── components/           # Reusable UI components
├── lib/
│   ├── googleDrive.ts    # Drive API integration
│   ├── utils.ts          # Helper functions (formatBytes, getIcon)
│   └── store.ts          # Zustand state management
├── .env.example          # Environment template
├── tailwind.config.ts    # Tailwind setup
└── README.md             # This file
```

---

## 💡 Usage Examples

- **Personal Cloud**: Host your resume, portfolio, and media.
- **Team Docs**: Share internal documents securely with role-based access.
- **Media Server**: Stream videos/music directly from Drive.
- **Code Snippets**: Share markdown or code files with syntax highlighting.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org) – The React Framework
- [Google Drive API](https://developers.google.com/drive) – Cloud storage backend
- [shadcn/ui](https://ui.shadcn.com) – Beautiful, accessible components
- [Prism.js](https://prismjs.com) – Syntax highlighting
- [Plyr](https://plyr.io) – Media player

---

## 📬 Contact

**Muhammad Ibnu Fauzi**  
🌐 [Portfolio](https://ifauzeee.vercel.app/)  
📧 ifauze343@gmail.com  
🐙 [GitHub @ibnufauzi13](https://github.com/ifauzeee)

---