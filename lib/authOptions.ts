import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { kv } from "@/lib/kv";
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
      const existingAdmins = (await kv.smembers(ADMIN_EMAILS_KEY)) as string[];
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

        const adminEmails = (await kv.smembers(ADMIN_EMAILS_KEY)) as string[];
        const envAdminsRaw = process.env.ADMIN_EMAILS || "";

        const normalizedInputEmail = email.toLowerCase().trim();
        const normalizedEnvAdmins = envAdminsRaw
          .split(",")
          .map((e) => e.trim().toLowerCase().replace(/["']/g, ""));

        const isAdmin =
          adminEmails.some((e) => e.toLowerCase() === normalizedInputEmail) ||
          normalizedEnvAdmins.includes(normalizedInputEmail);

        const envPass = (process.env.ADMIN_PASSWORD || "")
          .trim()
          .replace(/["']/g, "");
        const isPassValid = password === envPass;

        if (isAdmin && isPassValid) {
          return {
            id: email,
            name: email.split("@")[0],
            email: email,
            role: "ADMIN",
            isGuest: false,
          };
        }

        return null;
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

          if (config?.disableGuestLogin === true) {
            return null;
          }
        } catch {
          return null;
        }

        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return {
          id: guestId,
          name: "Guest User",
          email: `${guestId}@guest.local`,
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
        token.isGuest = false;

        const adminEmails = (await kv.smembers(ADMIN_EMAILS_KEY)) as string[];
        const envAdminsRaw = process.env.ADMIN_EMAILS || "";

        const normalizedUserEmail = user.email.toLowerCase().trim();
        const normalizedEnvAdmins = envAdminsRaw
          .split(",")
          .map((e) => e.trim().toLowerCase().replace(/["']/g, ""));

        const isAdmin =
          adminEmails.some((e) => e.toLowerCase() === normalizedUserEmail) ||
          normalizedEnvAdmins.includes(normalizedUserEmail);

        const isEditor = await kv.sismember(
          "zee-index:editors",
          normalizedUserEmail,
        );

        if (user.role) {
          token.role = user.role as any;
        } else {
          token.role = (
            isAdmin ? "ADMIN" : isEditor ? "EDITOR" : "USER"
          ) as any;
        }

        const is2FAEnabled = await kv.get(`2fa:enabled:${user.email}`);
        token.twoFactorRequired = !!is2FAEnabled;
      } else if (profile?.email && !token.email) {
        token.email = profile.email;

        const adminEmails = (await kv.smembers(ADMIN_EMAILS_KEY)) as string[];
        const envAdminsRaw = process.env.ADMIN_EMAILS || "";

        const normalizedProfileEmail = profile.email.toLowerCase().trim();
        const normalizedEnvAdmins = envAdminsRaw
          .split(",")
          .map((e) => e.trim().toLowerCase().replace(/["']/g, ""));

        const isAdmin =
          adminEmails.some((e) => e.toLowerCase() === normalizedProfileEmail) ||
          normalizedEnvAdmins.includes(normalizedProfileEmail);

        const isEditor = await kv.sismember(
          "zee-index:editors",
          normalizedProfileEmail,
        );

        token.role = (isAdmin ? "ADMIN" : isEditor ? "EDITOR" : "USER") as any;

        const is2FAEnabled = await kv.get(`2fa:enabled:${profile.email}`);
        token.twoFactorRequired = !!is2FAEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as any) || "USER";
        session.user.email = token.email as string;
        session.user.isGuest = !!token.isGuest;
        if (token.isGuest) {
          session.user.name = "Guest User";
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
