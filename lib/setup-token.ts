import { createHmac } from "crypto";
import { constantTimeEqual } from "@/lib/security";
import { logger } from "@/lib/logger";

/**
 * Until the app is configured, /setup can be reached by anyone who finds the
 * instance, and finishing it decides which Drive the instance serves (audit
 * Z2-26). Finishing first-time setup therefore requires a token that only
 * the operator can see: SETUP_TOKEN from the environment, or one derived
 * from NEXTAUTH_SECRET and printed to the server log. Being derived, it is
 * the same in every process and across restarts.
 */
export function getSetupToken(): string {
  const configured = process.env.SETUP_TOKEN?.trim();
  if (configured) return configured;

  const secret = process.env.NEXTAUTH_SECRET ?? "";
  return createHmac("sha256", secret)
    .update("zee-index:first-run-setup")
    .digest("hex")
    .slice(0, 24);
}

export function isValidSetupToken(
  candidate: string | null | undefined,
): boolean {
  return !!candidate && constantTimeEqual(candidate.trim(), getSetupToken());
}

const ANNOUNCED = Symbol.for("zee-index.setup-token-announced");

/** Print the token once per process so the operator can find it in the log. */
export function announceSetupToken(): void {
  const state = globalThis as typeof globalThis & { [ANNOUNCED]?: boolean };
  if (state[ANNOUNCED] || process.env.SETUP_TOKEN?.trim()) return;
  state[ANNOUNCED] = true;
  logger.warn(
    { setupToken: getSetupToken() },
    "[Setup] App is not configured. Enter this setup token on /setup to finish first-time setup.",
  );
}
