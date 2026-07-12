import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { changeOwnPassword } from "@/lib/user-management";
import { z } from "zod";

export const dynamic = "force-dynamic";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export { passwordSchema };

export const POST = createPublicRoute(
  async ({ body, session }) => {
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const { currentPassword, newPassword } = body as {
        currentPassword: string;
        newPassword: string;
      };
      await changeOwnPassword(email, currentPassword, newPassword);
      return NextResponse.json({ message: "Password updated" });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "CURRENT_PASSWORD_INVALID"
      ) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 },
      );
    }
  },
  { includeSession: true, bodySchema: passwordSchema, rateLimit: false },
);
