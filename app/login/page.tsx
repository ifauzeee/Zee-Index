// app/login/page.tsx
"use client";
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, KeyRound, LogIn } from 'lucide-react';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Component that uses the hooks
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });
      if (response.ok) {
        const redirectUrl = searchParams.get('redirect_url') || '/';
        router.push(redirectUrl);
        router.refresh();
      } else {
        setError('ID atau Kata Sandi salah. Coba lagi.');
      }
    } catch (err) {
      setError('Terjadi kesalahan pada jaringan. Coba lagi nanti.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Kolom Kiri (Ikon Besar) - hanya tampil di layar besar */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted/40 p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        >
          <i className="fab fa-google-drive text-primary/10 text-[15rem]"></i>
        </motion.div>
      </div>

      {/* Kolom Kanan (Form Login) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-sm"
        >
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold flex items-center justify-center lg:justify-start">
                <i className="fab fa-google-drive text-blue-500 mr-3 text-4xl"></i>
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                    Zee Index
                </span>
              </h1>
              <p className="text-muted-foreground mt-2">Selamat datang! Silakan login untuk melanjutkan.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={id}
                  placeholder="ID Pengguna"
                  onChange={(e) => setId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                  required
                />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  placeholder="Kata Sandi"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500 text-center pt-2">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:bg-primary/50"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></span>
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Masuk
                  </>
                )}
              </button>
            </form>
             <p className="text-center text-xs text-muted-foreground pt-8">
                © {currentYear} - Dibuat oleh Muhammad Ibnu Fauzi
             </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// The page now wraps the component in Suspense
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}