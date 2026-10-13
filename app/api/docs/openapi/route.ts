import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getOpenApiDocument } from "@/lib/openapi";

export const dynamic = "force-dynamic";

// Public at the route level; the proxy still requires a session for
// /api/docs/* because it is not in the public API list.
export const GET = createPublicRoute(
  async () => NextResponse.json(getOpenApiDocument()),
  { rateLimit: "API" },
);
