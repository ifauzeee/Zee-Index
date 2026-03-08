import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authLimiter } from "@/lib/ratelimit";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";

import type { NextAuthConfig } from "next-auth";

const CONFIG_KEY = "zee-index:config";

function normalizeAdminEmails(): string[] {
  const envAdminsRaw = process.env.ADMIN_EMAILS || "";
  return envAdminsRaw.split(",").map((e) =>
    e
      .trim()
      .toLowerCase()
      .replace(/^["']|["']$/g, ""),
  );
}

async function resolveRole(
  email: string,
): Promise<"ADMIN" | "EDITOR" | "USER"> {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedEnvAdmins = normalizeAdminEmails();

  const dbUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  const [isRedisAdmin, isRedisEditor] = await Promise.all([
    kv.sismember(REDIS_KEYS.ADMIN_USERS, normalizedEmail),
    kv.sismember(REDIS_KEYS.ADMIN_EDITORS, normalizedEmail),
  ]);

  const isAdmin =
    dbUser?.role === "ADMIN" ||
    normalizedEnvAdmins.includes(normalizedEmail) ||
    isRedisAdmin === 1;

  const isEditor = dbUser?.role === "EDITOR" || isRedisEditor === 1;

  if (isAdmin) return "ADMIN";
  if (isEditor) return "EDITOR";
  return "USER";
}

const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const forwardedFor = req?.headers?.get?.("x-forwarded-for");
        const ip = forwardedFor
          ? forwardedFor.split(",")[0].trim()
          : "127.0.0.1";

        const ratelimitResult = await authLimiter.check(ip);
        if (!ratelimitResult.success) {
          logger.warn({ ip }, "[Auth] Rate limit exceeded");
          throw new Error(
            "Terlalu banyak percobaan login. Silakan tunggu sebentar.",
          );
        }

        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          logger.warn("[Auth] No credentials provided");
          return null;
        }

        try {
          const normalizedInputEmail = email.toLowerCase().trim();
          const dbUser = await db.user.findUnique({
            where: { email: normalizedInputEmail },
          });

          const normalizedEnvAdmins = normalizeAdminEmails();

          const isAdminEnv = normalizedEnvAdmins.includes(normalizedInputEmail);
          const isAdminDb = dbUser?.role === "ADMIN";
          const isRedisAdmin = await kv.sismember(
            REDIS_KEYS.ADMIN_USERS,
            normalizedInputEmail,
          );
          const isAdmin = isAdminDb || isAdminEnv || isRedisAdmin === 1;

          const envPass = (process.env.ADMIN_PASSWORD || "")
            .trim()
            .replace(/^["']|["']$/g, "");
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
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() {
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
      if (user && (user as any).isGuest) {
        token.id = `guest_${Date.now()}`;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.isGuest = true;
      } else if (user && user.email) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.isGuest = false;

        const targetRole = await resolveRole(user.email);
        token.role = targetRole;

        const normalizedUserEmail = user.email.toLowerCase().trim();
        const dbUser = await db.user.findUnique({
          where: { email: normalizedUserEmail },
        });

        if (dbUser && dbUser.role !== targetRole) {
          await db.user.update({
            where: { email: normalizedUserEmail },
            data: { role: targetRole },
          });
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

        const targetRole = await resolveRole(normalizedProfileEmail);
        token.role = targetRole;

        if (dbUser.role !== targetRole) {
          await db.user.update({
            where: { email: normalizedProfileEmail },
            data: { role: targetRole },
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
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
