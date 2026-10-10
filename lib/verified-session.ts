import type { Session } from "next-auth";

/** True when the session belongs to a user who signed in but has not passed 2FA yet. */
export function isPending2FA(session: Session | null): boolean {
  return session?.user?.twoFactorRequired === true;
}

/** Session of a fully authenticated user, or null when the user is a guest of
 *  the app, is anonymous, or is still waiting on 2FA verification. */
export async function getVerifiedSession(): Promise<Session | null> {
  const authModule = await import("@/auth");
  const session = await authModule.auth();

  return isPending2FA(session) ? null : session;
}
