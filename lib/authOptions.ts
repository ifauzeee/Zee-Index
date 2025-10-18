import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { kv } from '@vercel/kv';

const ADMIN_EMAILS_KEY = 'zee-index:admins';

async function ensureInitialAdmins() {
  try {
    const initialAdmins = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(Boolean) || [];
    if (initialAdmins.length > 0) {
      const existingAdmins = await kv.smembers(ADMIN_EMAILS_KEY);
      const adminsToAdd = initialAdmins.filter(email => !existingAdmins.includes(email));
      
      if (adminsToAdd.length > 0) {
        await kv.sadd(ADMIN_EMAILS_KEY, ...adminsToAdd as [string, ...string[]]);
        console.log('Initial admins have been synced to Vercel KV.');
      }
    }
  } catch (error) {
    console.error("Failed to sync initial admins to KV:", error);
  }
}

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
        const adminEmails: string[] = await kv.smembers(ADMIN_EMAILS_KEY);
        if (adminEmails.includes(profile.email)) {
          token.role = "ADMIN";
        } else {
          token.role = "USER";
        }
        token.email = profile.email;
        
        const is2FAEnabled = await kv.get(`2fa:enabled:${profile.email}`);
        if (is2FAEnabled) {
          token.twoFactorRequired = true;
        } else {
          token.twoFactorRequired = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.email = token.email as string;
        session.user.twoFactorRequired = token.twoFactorRequired;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};