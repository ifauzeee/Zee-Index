import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { upsertUser, type UserRole } from "@/lib/user-management";
import { z } from "zod";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: z
    .string()
    .email("Invalid email")
    .transform((v) => v.toLowerCase().trim()),
  role: z.enum(["ADMIN", "EDITOR", "USER"]).default("USER"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

export { inviteSchema };

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { email, role, password } = body as {
        email: string;
        role: UserRole;
        password?: string;
      };
      const user = await upsertUser(email, role, password);
      return NextResponse.json({ message: "User invited", user });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to invite user" },
        { status: 500 },
      );
    }
  },
  { bodySchema: inviteSchema },
);
