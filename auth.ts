import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authLimiter } from "@/lib/ratelimit";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

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

          const envPassHash = process.env.ADMIN_PASSWORD_HASH || "";
          const envPass = (process.env.ADMIN_PASSWORD || "")
            .trim()
            .replace(/^["']|["']$/g, "");

          let isPassValid = false;
          if (envPassHash) {
            isPassValid = await bcrypt.compare(password, envPassHash);
          } else if (envPass) {
            const { timingSafeEqual } = await import("crypto");
            const a = Buffer.from(password);
            const b = Buffer.from(envPass);
            isPassValid = a.length === b.length && timingSafeEqual(a, b);
          }

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
            logger.info(
              { email: normalizedInputEmail },
              "[Auth] Success: Credentials match",
            );

            let currentUser = dbUser;
            if (!currentUser) {
              logger.info(
                { email: normalizedInputEmail },
                "[Auth] Creating missing admin user in DB",
              );
              currentUser = await db.user.create({
                data: {
                  email: normalizedInputEmail,
                  role: "ADMIN",
                  name: normalizedInputEmail.split("@")[0],
                },
              });
            }

            return {
              id: currentUser.id,
              name: currentUser.name || normalizedInputEmail.split("@")[0],
              email: normalizedInputEmail,
              role: "ADMIN",
              isGuest: false,
            };
          }

          logger.warn(
            { isAdmin, isPassValid, email: normalizedInputEmail },
            "[Auth] Failed: Invalid creds or not admin",
          );
          return null;
        } catch (error) {
          logger.error({ err: error }, "[Auth] Exception in authorize");
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

        const guestId = `guest_${Date.now()}_${randomUUID().replace(/-/g, "").substring(0, 12)}`;
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
      logger.debug(
        { hasUser: !!user, hasProfile: !!profile, email: token.email },
        "[Auth] JWT Callback Start",
      );
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

        try {
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
        } catch (err) {
          logger.error(
            { err, email: user.email },
            "[Auth] Error in JWT callback resolving role",
          );
        }

        token.twoFactorRequired = false;
      } else if (profile?.email && !token.email) {
        token.email = profile.email;

        const normalizedProfileEmail = profile.email.toLowerCase().trim();
        try {
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
        } catch (err) {
          logger.error(
            { err, email: normalizedProfileEmail },
            "[Auth] Error in JWT callback for profile",
          );
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
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
