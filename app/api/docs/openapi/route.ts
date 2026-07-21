import { NextResponse } from "next/server";
import { getOpenApiDocument } from "@/lib/openapi-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const doc = getOpenApiDocument();
  return NextResponse.json(doc);
}
