# 📁 Zee-Index – Google Drive File Indexing System

![Google Drive](https://seekicon.com/free-icon-download/google-drive_10.svg)

## 📖 Overview

Zee-Index is a comprehensive **Next.js-based file indexing and management system** designed to organize, display, and control access to files stored in Google Drive. It supports authentication, role-based access, folder protection, email notifications, and more.

---

## ✨ Features

- 🔐 **Google OAuth Authentication** – Secure login via Google accounts
- 📂 **File & Folder Indexing** – Automatically index and display Drive contents
- 👥 **Role-Based Access Control** – Admin and user-level permissions
- 🛡️ **Password-Protected Folders** – Secure sensitive directories
- 📧 **Email Integration** – Notifications via Nodemailer (SMTP)
- 🗃️ **Redis/KV Storage** – Efficient caching and session management
- ⚡ **Built with Next.js 14** – Modern React framework with App Router
- 🎨 **Tailwind CSS & Shadcn/UI** – Clean, responsive UI components
- 🔄 **Cron Job Support** – Automated tasks and storage monitoring

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Google Cloud Platform project with Drive API enabled
- Redis instance (e.g., Upstash, Redis Cloud)
- SMTP server (e.g., Gmail, SendGrid)

---

## ⚙️ Installation

1. **Clone the repository**

```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Google Drive API
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REFRESH_TOKEN="your-google-refresh-token"

# Application
NEXT_PUBLIC_ROOT_FOLDER_ID="your-root-folder-id"
NEXT_PUBLIC_ROOT_FOLDER_NAME="your-root-folder-name"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Admin & Folder Access
ADMIN_EMAILS="admin1@example.com,admin2@example.com"
PRIVATE_FOLDER_IDS="folder_id_1,folder_id_2"
SHARE_SECRET_KEY="your-random-share-secret"

# Password-Protected Folders
PROTECTED_FOLDERS_JSON='{
  "folder_id_1": {"id": "username1", "password": "password1"},
  "folder_id_2": {"id": "username2", "password": "password2"}
}'

# Redis / KV Storage
KV_URL="your-redis-url"
KV_REST_API_URL="your-kv-rest-url"
KV_REST_API_TOKEN="your-kv-token"
KV_REST_API_READ_ONLY_TOKEN="your-kv-readonly-token"
REDIS_URL="your-redis-url"

# Nodemailer (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM='"Zee-Index" <your-email@gmail.com>'

# Cron Job Protection & Storage Monitoring
CRON_SECRET="your-cron-secret"
STORAGE_WARNING_THRESHOLD="0.90"
```

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Project Structure

```
zee-index/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (main)/            # Main application routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable React components
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication config
│   ├── drive.ts          # Google Drive API
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

---

## 🔧 Configuration

### Google API Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Google Drive API**
3. Configure OAuth 2.0 credentials
4. Add authorized redirect URIs (e.g., `http://localhost:3000/api/auth/callback/google`)

### Redis Setup

Use any Redis-compatible service:

- [Upstash](https://upstash.com/)
- [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)
- Self-hosted Redis instance

### Email Service

Configure SMTP settings for notifications:

- **Gmail**: Use App Passwords for secure access
- **SendGrid**: API-based SMTP service
- **Mailtrap**: Testing environment

---

## 📦 Dependencies

### Core Technologies

- **Next.js 14** – React framework
- **NextAuth.js** – Authentication
- **Google APIs** – Drive integration
- **Tailwind CSS** – Styling
- **Shadcn/UI** – Component library
- **Redis/Upstash** – Data caching
- **Nodemailer** – Email service

### Key Packages

```json
{
  "googleapis": "Drive API integration",
  "next-auth": "Authentication system",
  "tailwindcss": "CSS framework",
  "lucide-react": "Icon library",
  "zustand": "State management",
  "jszip": "File compression",
  "plyr": "Media player",
  "react-markdown": "Markdown rendering"
}
```

---

## 🛠️ Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run start` – Start production server
- `npm run lint` – Run ESLint
- `npm run type-check` – TypeScript validation

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com/)
3. Configure environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

- **Netlify**: Configure build settings and environment variables
- **Railway**: Use `npm start` as start command
- **Docker**: Create custom Dockerfile for containerization

---

## 🔒 Security Features

- ✅ OAuth 2.0 authentication
- ✅ Role-based access control
- ✅ Password-protected folders
- ✅ Environment variable protection
- ✅ Secure cookie handling
- ✅ CSRF protection

---

## 📧 Email Templates

The system includes email templates for:

- User registration confirmations
- Password reset requests
- File share notifications
- Admin alerts for storage limits

---

## 🔄 Cron Jobs

Set up cron jobs for:

- Storage usage monitoring
- Cache cleanup
- Regular indexing updates
- Email notification batches

Use `CRON_SECRET` to secure endpoint access.

---

## 🐛 Troubleshooting

### Common Issues

1. **Authentication errors**: Verify Google OAuth credentials and redirect URIs
2. **Drive API errors**: Check folder permissions and API quotas
3. **Redis connection issues**: Validate connection strings and network access
4. **Email delivery problems**: Verify SMTP settings and credentials

### Debug Mode

Enable debug logging by setting `DEBUG=true` in environment variables.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For support and questions:

- 📧 Email: ifauze343@gmail.com
- 🐛 GitHub Issues: [Create an issue](https://github.com/ifauzeee/zee-index/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/ifauzeee/zee-index/discussions)

---

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 🏆 Acknowledgments

- Google Drive API team for comprehensive documentation
- Next.js team for the excellent framework
- Shadcn/UI for beautiful component templates
- Open source community for various supporting libraries

---

**Zee-Index** – Organize and secure your Google Drive files with modern web technology. 🚀