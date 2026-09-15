interface ForbiddenPageTranslations {
  title: string;
  heading: string;
  message: string;
  button: string;
  footer: string;
}

const TRANSLATIONS: Record<string, ForbiddenPageTranslations> = {
  en: {
    title: "Access Denied",
    heading: "Access Denied",
    message: "Only administrators can access the Setup page.",
    button: "Login as Admin",
    footer: "Zee Index",
  },
  id: {
    title: "Akses Ditolak",
    heading: "Akses Ditolak",
    message: "Hanya admin yang dapat mengakses halaman Setup.",
    button: "Login sebagai Admin",
    footer: "Zee Index",
  },
  "zh-TW": {
    title: "拒絕訪問",
    heading: "拒絕訪問",
    message: "只有管理員才能訪問設置頁面。",
    button: "以管理員身分登錄",
    footer: "Zee Index",
  },
};

export function getForbiddenPageHtml(locale: string): string {
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      background: hsl(222.2, 84%, 4.9%);
      color: hsl(210, 40%, 98%);
      -webkit-font-smoothing: antialiased;
    }
    .container {
      display: flex; flex-direction: column; align-items: center;
      padding: 2rem; width: 100%; max-width: 400px; text-align: center;
    }
    .icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 3rem; height: 3rem;
      background: hsl(215, 20.2%, 15%);
      border-radius: 50%;
      margin-bottom: 1.5rem;
    }
    .icon svg { width: 1.5rem; height: 1.5rem; color: hsl(215, 20.2%, 65.1%); }
    h1 {
      font-size: 1.5rem; font-weight: 600;
      margin-bottom: 0.5rem;
    }
    p {
      color: hsl(215, 20.2%, 65.1%);
      line-height: 1.5; margin-bottom: 1.5rem;
      font-size: 0.9375rem;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1.5rem;
      background: hsl(210, 40%, 98%);
      color: hsl(222.2, 47.4%, 11.2%);
      text-decoration: none; border-radius: 0.5rem;
      font-weight: 500; font-size: 0.875rem;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.9; }
    .btn svg { width: 1rem; height: 1rem; }
    .footer { margin-top: 3rem; font-size: 0.75rem; color: hsl(215, 20.2%, 40%); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
    <h1>${t.heading}</h1>
    <p>${t.message}</p>
    <a href="/login" class="btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      ${t.button}
    </a>
    <p class="footer">&copy; ${new Date().getFullYear()} ${t.footer}</p>
  </div>
</body>
</html>`;
}
