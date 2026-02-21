import { NextResponse, NextRequest } from "next/server";
import { kv } from "@/lib/kv";

const FILE_REQUESTS_KEY = "zee-index:file-requests";

interface RequestData {
  title: string;
  folderName: string;
  expiresAt: number;
  folderId: string;
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ token: string }> },
) {
  const params = await props.params;
  const { token } = params;

  try {
    const requestData = await kv.hget<RequestData>(FILE_REQUESTS_KEY, token);

    if (!requestData) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (Date.now() > requestData.expiresAt) {
      await kv.hdel(FILE_REQUESTS_KEY, token);
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    return NextResponse.json({
      title: requestData.title,
      folderName: requestData.folderName,
      expiresAt: requestData.expiresAt,
      folderId: requestData.folderId,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
