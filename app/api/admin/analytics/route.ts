import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { getAnalyticsData } from "@/lib/analyticsTracker";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getAnalyticsCached = unstable_cache(
  async () => {
    return await getAnalyticsData();
  },
  ["admin-analytics"],
  { revalidate: 60, tags: ["admin-analytics"] },
);

export const GET = createAdminRoute(async () => {
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
});
