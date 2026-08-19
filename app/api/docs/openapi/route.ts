import { NextResponse } from "next/server";
import { getOpenApiDocument } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  const doc = getOpenApiDocument();
  return NextResponse.json(doc);
}
