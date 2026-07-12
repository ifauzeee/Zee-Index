import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";

export const POST = createPublicRoute(
  async () => {
    const response = NextResponse.json({
      success: true,
      message: "Logged out",
    });
    response.cookies.set("local_storage_token", "", {
      maxAge: 0,
      path: "/",
    });
    return response;
  },
  { rateLimit: "API", includeSession: false },
);

export const dynamic = "force-dynamic";
