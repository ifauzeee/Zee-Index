import { z } from "zod";
import { REDIS_KEYS } from "@/lib/constants";

const manualDriveIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, "Manual drive ID format is invalid.");

const manualDriveNameSchema = z.string().trim().min(1).max(120);

export const MANUAL_DRIVES_KEY = REDIS_KEYS.MANUAL_DRIVES;

export const manualDriveRecordSchema = z.object({
  id: manualDriveIdSchema,
  name: manualDriveNameSchema,
  isProtected: z.boolean().optional(),
});

export const manualDriveCreateSchema = z.object({
  id: manualDriveIdSchema,
  name: manualDriveNameSchema,
  password: z.string().trim().optional(),
});

export const manualDriveDeleteSchema = z.object({
  id: manualDriveIdSchema,
});

export type ManualDriveRecord = z.infer<typeof manualDriveRecordSchema>;
export type ManualDriveCreateInput = z.infer<typeof manualDriveCreateSchema>;

export function parseManualDriveRecords(value: unknown): ManualDriveRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => manualDriveRecordSchema.safeParse(entry))
    .filter((result) => result.success)
    .map((result) => result.data);
}

export function parseManualDrivesFromEnv(
  rawValue?: string,
): ManualDriveRecord[] {
  const envManualDrivesRaw = rawValue?.trim() || "";

  if (!envManualDrivesRaw) {
    return [];
  }

  if (envManualDrivesRaw.startsWith("[")) {
    try {
      const parsed = JSON.parse(envManualDrivesRaw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((entry) => {
          if (typeof entry === "string") {
            return manualDriveRecordSchema.safeParse({
              id: entry,
              name: entry,
            });
          }

          return manualDriveRecordSchema.safeParse(entry);
        })
        .filter((result) => result.success)
        .map((result) => result.data);
    } catch {
      return [];
    }
  }

  return envManualDrivesRaw
    .split(",")
    .map((entry) => {
      const [id, name] = entry.split(":");
      return manualDriveRecordSchema.safeParse({
        id,
        name: name?.trim() || id?.trim(),
      });
    })
    .filter((result) => result.success)
    .map((result) => result.data);
}
