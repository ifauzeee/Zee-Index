
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
    <html lang="id" className="dark" style={{ colorScheme: 'dark' }}>
      <body>
        {children}
      </body>
    </html>
  )
}