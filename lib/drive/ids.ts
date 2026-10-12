import { z } from "zod";
import { RequestError } from "@/lib/errors";

/**
 * Drive file, folder and shared-drive ids use the URL-safe base64 alphabet.
 * Anything else (quotes, slashes, `?`, `&`, `%`) would change the Drive API
 * URL or query it is interpolated into (Z2-05).
 */
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function isDriveId(id: unknown): id is string {
  return typeof id === "string" && DRIVE_ID_PATTERN.test(id);
}

/** A RequestError so route handlers that map RequestError.status answer 400. */
export class InvalidDriveIdError extends RequestError {
  constructor(id: string) {
    super(`Invalid Drive id: ${JSON.stringify(id.slice(0, 64))}`, {
      status: 400,
    });
    this.name = "InvalidDriveIdError";
  }
}

/** Throw unless `id` is safe to put in a Drive API URL or query. */
export function assertDriveId(id: string): void {
  if (!isDriveId(id)) throw new InvalidDriveIdError(id);
}

export const driveIdSchema = z
  .string()
  .regex(DRIVE_ID_PATTERN, "Invalid Drive id.");
