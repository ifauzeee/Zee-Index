import { kv } from "@/lib/kv";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const EDITORS_KEY = "zee-index:editors";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const editors = await kv.smembers(EDITORS_KEY);
    return NextResponse.json(editors || []);
  } catch (error) {
    console.error("Editors fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch editors" },
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

    await kv.sadd(EDITORS_KEY, email);
    return NextResponse.json({ message: "Editor added", email });
  } catch (error) {
    console.error("Editor add error:", error);
    return NextResponse.json(
      { error: "Failed to add editor" },
      { status: 500 },
    );
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

    await kv.srem(EDITORS_KEY, email);
    return NextResponse.json({ message: "Editor removed", email });
  } catch (error) {
    console.error("Editor remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove editor" },
      { status: 500 },
    );
  }
}
