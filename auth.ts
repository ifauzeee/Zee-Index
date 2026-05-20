import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authLimiter } from "@/lib/ratelimit";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { getPublicAppConfig } from "@/lib/app-config";
import bcrypt from "bcryptjs";
import type { ActivityDetails } from "@/lib/activityLogger";

import type { NextAuthConfig } from "next-auth";

async function setupTwoFactorForToken(email: string, token: any) {
  try {
    const is2FAEnabled = await kv.get(`2fa:enabled:${email}`);
    token.twoFactorRequired = !!is2FAEnabled;
    if (token.twoFactorRequired) {
      token.sessionId = crypto.randomUUID();
    }
  } catch {
    token.twoFactorRequired = false;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const encodedA = encoder.encode(a);
  const encodedB = encoder.encode(b);

  if (encodedA.length !== encodedB.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < encodedA.length; i += 1) {
    result |= encodedA[i] ^ encodedB[i];
  }

  return result === 0;
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`;
}

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

type AuthAuditType = "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "RATE_LIMITED";

function emitAuthActivity<T extends AuthAuditType>(
  type: T,
  details: ActivityDetails<T>,
): void {
  void import("@/lib/activityLogger")
    .then(({ logActivity }) => logActivity(type, details))
    .catch((error) => {
      logger.error({ err: error, type }, "[Auth] Failed to record auth event");
    });
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
          emitAuthActivity("RATE_LIMITED", {
            userEmail:
              typeof credentials?.email === "string"
                ? credentials.email.toLowerCase().trim()
                : undefined,
            status: "blocked",
            metadata: {
              scope: "auth",
              identifier: ip,
            },
          });
          logger.warn({ ip }, "[Auth] Rate limit exceeded");
          throw new Error(
            "Terlalu banyak percobaan login. Silakan tunggu sebentar.",
          );
        }

        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          emitAuthActivity("LOGIN_FAILURE", {
            userEmail:
              typeof email === "string"
                ? email.toLowerCase().trim()
                : undefined,
            status: "failure",
            metadata: {
              reason: "missing_credentials",
            },
          });
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
          const isProduction = process.env.NODE_ENV === "production";

          let isPassValid = false;
          if (isProduction && !envPassHash) {
            logger.error(
              { email: normalizedInputEmail },
              "[Auth] ADMIN_PASSWORD_HASH is required in production for credential login",
            );
            return null;
          }

          if (envPassHash) {
            isPassValid = await bcrypt.compare(password, envPassHash);
          } else if (!isProduction && envPass) {
            isPassValid = constantTimeEqual(password, envPass);
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
            emitAuthActivity("LOGIN_SUCCESS", {
              userEmail: normalizedInputEmail,
              userRole: "ADMIN",
              status: "success",
            });
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
          emitAuthActivity("LOGIN_FAILURE", {
            userEmail: normalizedInputEmail,
            status: "failure",
            metadata: {
              reason: isAdmin
                ? "invalid_password"
                : "not_admin_or_invalid_credentials",
            },
          });
          return null;
        } catch (error) {
          emitAuthActivity("LOGIN_FAILURE", {
            userEmail: email ? email.toLowerCase().trim() : undefined,
            status: "failure",
            error: error instanceof Error ? error.message : "auth_exception",
            metadata: {
              reason: "auth_exception",
            },
          });
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
          const config = await getPublicAppConfig();
          if (config.disableGuestLogin) {
            return null;
          }
        } catch {}

        const guestId = generateGuestId();
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
    async jwt({ token, profile, user, trigger, session }) {
      if (
        trigger === "update" &&
        session?.twoFactorVerified &&
        token.sessionId
      ) {
        try {
          const passed = await kv.get(`2fa_passed:${token.sessionId}`);
          if (passed) {
            token.twoFactorRequired = false;
            await kv.del(`2fa_passed:${token.sessionId}`);
          }
        } catch (err) {
          logger.error({ err }, "[Auth] Error verifying 2fa_passed flag");
        }
      }

      logger.debug(
        { hasUser: !!user, hasProfile: !!profile, email: token.email },
        "[Auth] JWT Callback Start",
      );
      if (user && user.isGuest) {
        token.id = `guest_${Date.now()}`;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
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

        await setupTwoFactorForToken(user.email.toLowerCase().trim(), token);
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

        await setupTwoFactorForToken(normalizedProfileEmail, token);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role || "USER";
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
        sameSite: "strict",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
