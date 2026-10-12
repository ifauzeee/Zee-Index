import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { hasUserPassword, setUserPassword } from "@/lib/user-management";
import { setPasswordHash } from "@/lib/credentials";
import { z } from "zod";

const passwordRequestSchema = z.object({
  email: z.string().email("Email parameter is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const emailQuerySchema = z.object({
  email: z.string().email("Email parameter is required"),
});

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const email = normalizeEmail(body.email);
      await setUserPassword(email, body.password);

      return NextResponse.json({
        success: true,
        message: `Password for ${email} has been set successfully`,
      });
    } catch (error) {
      logger.error({ err: error }, "Error setting password");
      return NextResponse.json(
        { error: "Failed to set password" },
        { status: 500 },
      );
    }
  },
  { bodySchema: passwordRequestSchema },
);

export const DELETE = createAdminRoute(
  async ({ query }) => {
    try {
      const email = normalizeEmail(query.email);
      await setPasswordHash(email, null);

      return NextResponse.json({
        success: true,
        message: `Password for ${email} has been removed`,
      });
    } catch (error) {
      logger.error({ err: error }, "Error deleting password");
      return NextResponse.json(
        { error: "Failed to delete password" },
        { status: 500 },
      );
    }
  },
  { querySchema: emailQuerySchema },
);

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(
  async ({ query }) => {
    try {
      const email = normalizeEmail(query.email);
      return NextResponse.json({
        email,
        hasPassword: await hasUserPassword(email),
      });
    } catch (error) {
      logger.error({ err: error }, "Error checking password");
      return NextResponse.json(
        { error: "Failed to check password" },
        { status: 500 },
      );
    }
  },
  { querySchema: emailQuerySchema },
);
