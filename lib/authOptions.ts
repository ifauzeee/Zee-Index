import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { User } from "next-auth";
import { logger } from "@/lib/logger";

const CONFIG_KEY = "zee-index:config";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db) as any,
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
        if (!credentials?.email || !credentials.password) {
          logger.warn("[Auth] No credentials provided");
          return null;
        }

        const email = credentials.email;
        const password = credentials.password;

        try {
          const normalizedInputEmail = email.toLowerCase().trim();
          const dbUser = await db.user.findUnique({
            where: { email: normalizedInputEmail },
          });
          const envAdminsRaw = process.env.ADMIN_EMAILS || "";
          const normalizedEnvAdmins = envAdminsRaw
            .split(",")
            .map((e) => e.trim().toLowerCase().replace(/["']/g, ""));

          const isAdminEnv = normalizedEnvAdmins.includes(normalizedInputEmail);
          const isAdminDb = dbUser?.role === "ADMIN";
          const isAdmin = isAdminDb || isAdminEnv;

          const envPass = (process.env.ADMIN_PASSWORD || "")
            .trim()
            .replace(/["']/g, "");
          const isPassValid = password === envPass;

          logger.info(
            {
              inputEmail: normalizedInputEmail,
              isAdminDb,
              isAdminEnv,
              isAdmin,
              isPassValid,
            },
            "[Auth] Login attempt",
          );

          if (isAdmin && isPassValid) {
            logger.info({ email }, "[Auth] Login successful");

            if (!dbUser) {
              await db.user.create({
                data: {
                  email: normalizedInputEmail,
                  role: "ADMIN",
                  name: normalizedInputEmail.split("@")[0],
                },
              });
            }

            return {
              id: dbUser?.id || normalizedInputEmail,
              name: dbUser?.name || normalizedInputEmail.split("@")[0],
              email: normalizedInputEmail,
              role: "ADMIN",
              isGuest: false,
            };
          }

          logger.info({ isAdmin, isPassValid }, "[Auth] Login failed");
          return null;
        } catch (error) {
          logger.error({ err: error }, "[Auth] Error during authorization");
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize(): Promise<User | null> {
        try {
          const configEntry = await db.adminConfig.findUnique({
            where: { key: CONFIG_KEY },
          });
          if (configEntry) {
            const config = JSON.parse(configEntry.value);
            if (config?.disableGuestLogin === true) {
              return null;
            }
          }
        } catch {}

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

        const normalizedUserEmail = user.email.toLowerCase().trim();
        const dbUser = await db.user.findUnique({
          where: { email: normalizedUserEmail },
        });

        const envAdminsRaw = process.env.ADMIN_EMAILS || "";
        const normalizedEnvAdmins = envAdminsRaw
          .split(",")
          .map((e) => e.trim().toLowerCase().replace(/["']/g, ""));

        const isAdmin =
          dbUser?.role === "ADMIN" ||
          normalizedEnvAdmins.includes(normalizedUserEmail);
        const isEditor = dbUser?.role === "EDITOR";

        if (user.role) {
          token.role = user.role as any;
        } else {
          token.role = (
            isAdmin ? "ADMIN" : isEditor ? "EDITOR" : "USER"
          ) as any;

          if (dbUser && dbUser.role !== token.role) {
            await db.user.update({
              where: { email: normalizedUserEmail },
              data: { role: token.role as string },
            });
          }
        }

        token.twoFactorRequired = false;
      } else if (profile?.email && !token.email) {
        token.email = profile.email;

        const normalizedProfileEmail = profile.email.toLowerCase().trim();
        let dbUser = await db.user.findUnique({
          where: { email: normalizedProfileEmail },
        });

        if (!dbUser) {
          dbUser = await db.user.create({
            data: {
              email: normalizedProfileEmail,
              name: profile.name || normalizedProfileEmail.split("@")[0],
              role: "USER",
            },
          });
        }

        const envAdminsRaw = process.env.ADMIN_EMAILS || "";
        const normalizedEnvAdmins = envAdminsRaw
          .split(",")
          .map((e) => e.trim().toLowerCase().replace(/["']/g, ""));

        const isAdmin =
          dbUser?.role === "ADMIN" ||
          normalizedEnvAdmins.includes(normalizedProfileEmail);
        const isEditor = dbUser?.role === "EDITOR";

        token.role = (isAdmin ? "ADMIN" : isEditor ? "EDITOR" : "USER") as any;

        if (dbUser.role !== token.role) {
          await db.user.update({
            where: { email: normalizedProfileEmail },
            data: { role: token.role as string },
          });
        }

        token.twoFactorRequired = false;
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
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
} as AuthOptions;
