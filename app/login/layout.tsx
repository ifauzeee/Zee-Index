import '../(main)/globals.css'; // Memuat CSS global agar tampilan konsisten

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
    // Paksakan tema gelap dengan menambahkan className="dark"
    <html lang="id" className="dark" style={{ colorScheme: 'dark' }}>
      <body>
        {children}
      </body>
    </html>
  )
}