import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getAnalyticsData } from "@/lib/analyticsTracker";
import { type Session } from "next-auth";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

const getAnalyticsCached = unstable_cache(
  async () => {
    return await getAnalyticsData();
  },
  ["admin-analytics"],
  { revalidate: 60, tags: ["admin-analytics"] },
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const analytics = await getAnalyticsCached();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data." },
      { status: 500 },
    );
  }
}
