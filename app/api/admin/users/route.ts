import { kv } from "@/lib/kv";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const ADMIN_USERS_KEY = "zee-index:admins";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admins = await kv.smembers(ADMIN_USERS_KEY);
    return NextResponse.json(admins || []);
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await kv.sadd(ADMIN_USERS_KEY, email);
    return NextResponse.json({ message: "Admin added", email });
  } catch (error) {
    console.error("Admin add error:", error);
    return NextResponse.json({ error: "Failed to add admin" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await kv.srem(ADMIN_USERS_KEY, email);
    return NextResponse.json({ message: "Admin removed", email });
  } catch (error) {
    console.error("Admin remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove admin" },
      { status: 500 },
    );
  }
}
