import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { kv } from "@vercel/kv";
import { User } from "next-auth";

const ADMIN_EMAILS_KEY = "zee-index:admins";
const CONFIG_KEY = "zee-index:config";

async function ensureInitialAdmins() {
  try {
    const initialAdmins =
      process.env.ADMIN_EMAILS?.split(",")
        .map((email) => email.trim())
        .filter(Boolean) || [];
    if (initialAdmins.length > 0) {
      const existingAdmins = await kv.smembers(ADMIN_EMAILS_KEY);
      const adminsToAdd = initialAdmins.filter(
        (email) => !existingAdmins.includes(email),
      );
      if (adminsToAdd.length > 0) {
        await kv.sadd(
          ADMIN_EMAILS_KEY,
          ...(adminsToAdd as [string, ...string[]]),
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
}

ensureInitialAdmins();

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials.password) return null;

        const email = credentials.email;
        const password = credentials.password;

        const adminEmails: string[] = await kv.smembers(ADMIN_EMAILS_KEY);
        const isAdmin = adminEmails.includes(email);

        const storedHash: string | null = await kv.get(`password:${email}`);

        let isValid = false;
        if (storedHash) {
          const bcrypt = await import("bcryptjs");
          isValid = await bcrypt.compare(password, storedHash);
        } else if (isAdmin && process.env.ADMIN_PASSWORD) {
          isValid = password === process.env.ADMIN_PASSWORD;
        }

        if (!isValid) return null;

        return {
          id: email,
          name: email.split("@")[0],
          email: email,
          role: isAdmin ? "ADMIN" : "USER",
          isGuest: false,
        };
      },
    }),
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize(): Promise<User | null> {
        try {
          const config: { disableGuestLogin?: boolean } | null =
            await kv.get(CONFIG_KEY);

          if (!config || config.disableGuestLogin !== false) {
            return null;
          }
        } catch {
          return null;
        }

        return {
          id: "guest-user",
          name: "Guest User",
          email: "guest@example.com",
          role: "GUEST",
          isGuest: true,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, profile, user }) {
      if (user && user.isGuest) {
        token.id = `guest_${Date.now()}`;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.isGuest = user.isGuest;
      } else if (user && user.email) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.isGuest = false;

        const is2FAEnabled = await kv.get(`2fa:enabled:${user.email}`);
        token.twoFactorRequired = !!is2FAEnabled;
      } else if (profile?.email) {
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
        session.user.isGuest = token.isGuest;
        if (token.isGuest) {
          session.user.name = "Guest User";
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://"),
      },
    },
  },
};
