import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Ambil daftar email admin dari environment variable
const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  
  // --- TAMBAHKAN BAGIAN INI ---
  pages: {
    signIn: '/login', // Arahkan ke halaman login kustom Anda
    error: '/login',  // Arahkan ke halaman login juga jika ada error
  },
  // ---------------------------

  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) {
        // Cek apakah email pengguna yang login ada di daftar admin
        if (adminEmails.includes(profile.email)) {
          token.role = "ADMIN";
        } else {
          token.role = "USER";
        }
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Menyalin data custom (role dan email) dari token ke objek session
      if (session.user) {
        session.user.role = token.role as 'ADMIN' | 'USER';
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Tambahkan deklarasi tipe untuk NextAuth Session
declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'ADMIN' | 'USER';
    };
  }
}