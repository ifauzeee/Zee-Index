// app/login/layout.tsx
import '../(main)/globals.css';

export const metadata = {
  title: 'Login - Zee Index',
  description: 'Halaman login untuk mengakses Zee Index',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Paksakan tema gelap di sini agar serasi dengan halaman utama
    <html lang="id" className="dark" style={{ colorScheme: 'dark' }}>
      <body>
        {children}
      </body>
    </html>
  )
}