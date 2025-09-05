import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

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