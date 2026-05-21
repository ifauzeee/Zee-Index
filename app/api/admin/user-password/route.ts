import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordRequestSchema = z.object({
  email: z.string().email("Email parameter is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const emailQuerySchema = z.object({
  email: z.string().email("Email parameter is required"),
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { email, password } = body;
      const hashedPassword = await bcrypt.hash(password, 10);
      await kv.set(`password:${email}`, hashedPassword);

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
      const { email } = query;
      await kv.del(`password:${email}`);

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
      const { email } = query;
      const hasPassword = await kv.exists(`password:${email}`);

      return NextResponse.json({
        email,
        hasPassword: hasPassword === 1,
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
