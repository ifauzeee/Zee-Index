import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import bcrypt from "bcryptjs";

export const POST = createAdminRoute(async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await kv.set(`password:${email}`, hashedPassword);

    return NextResponse.json({
      success: true,
      message: `Password for ${email} has been set successfully`,
    });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json(
      { error: "Failed to set password" },
      { status: 500 },
    );
  }
});

export const DELETE = createAdminRoute(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 },
      );
    }

    await kv.del(`password:${email}`);

    return NextResponse.json({
      success: true,
      message: `Password for ${email} has been removed`,
    });
  } catch (error) {
    console.error("Error deleting password:", error);
    return NextResponse.json(
      { error: "Failed to delete password" },
      { status: 500 },
    );
  }
});

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 },
      );
    }

    const hasPassword = await kv.exists(`password:${email}`);

    return NextResponse.json({
      email,
      hasPassword: hasPassword === 1,
    });
  } catch (error) {
    console.error("Error checking password:", error);
    return NextResponse.json(
      { error: "Failed to check password" },
      { status: 500 },
    );
  }
});
