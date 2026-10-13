import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import { changeOwnPassword } from "@/lib/user-management";
import { checkRateLimit } from "@/lib/ratelimit";
import { ERROR_MESSAGES } from "@/lib/constants";
import { z } from "zod";

export const dynamic = "force-dynamic";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export { passwordSchema };

export const POST = createUserRoute(
  async ({ request, body, session }) => {
    // requireEmail guarantees an email on the session.
    const email = session.user.email!.toLowerCase().trim();

    // The current password is checked here, so a stolen session could
    // otherwise guess it without limit. Budget per account as well as per
    // IP (rateLimit: "AUTH" below), like the login form.
    const perAccount = await checkRateLimit(
      request,
      "AUTH",
      `password-change:${email}`,
    );
    if (!perAccount.success) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
        { status: 429 },
      );
    }

    try {
      const { currentPassword, newPassword } = body;
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
  { requireEmail: true, bodySchema: passwordSchema, rateLimit: "AUTH" },
);
