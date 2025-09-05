// File: lib/authOptions.ts
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { kv } from '@vercel/kv';

const ADMIN_EMAILS_KEY = 'zee-index:admins';

// Fungsi untuk memastikan daftar admin awal ada di KV
async function ensureInitialAdmins() {
  try {
    const initialAdmins = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(Boolean) || [];
    if (initialAdmins.length > 0) {
      const existingAdmins = await kv.smembers(ADMIN_EMAILS_KEY);
      const adminsToAdd = initialAdmins.filter(email => !existingAdmins.includes(email));
      
      if (adminsToAdd.length > 0) {
        // PERBAIKAN: Menambahkan type assertion '[string, ...string[]]' untuk mengatasi error TS2556
        // Ini meyakinkan TypeScript bahwa array ini tidak kosong, yang aman karena ada di dalam blok if (adminsToAdd.length > 0).
        await kv.sadd(ADMIN_EMAILS_KEY, ...adminsToAdd as [string, ...string[]]);
        console.log('Initial admins have been synced to Vercel KV.');
      }
    }
  } catch (error) {
    console.error("Failed to sync initial admins to KV:", error);
  }
}

// Panggil fungsi ini sekali saat server dimulai
ensureInitialAdmins();

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) {
        // Logika sekarang membaca daftar admin dari Vercel KV
        const adminEmails: string[] = await kv.smembers(ADMIN_EMAILS_KEY);
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
      if (session.user) {
        session.user.role = token.role as 'ADMIN' | 'USER';
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};