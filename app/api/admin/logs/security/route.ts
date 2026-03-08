import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSecurityLogs } from "@/lib/activityLogger";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const logs = await getSecurityLogs(20);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[Security Audit API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security logs" },
      { status: 500 },
    );
  }
}
