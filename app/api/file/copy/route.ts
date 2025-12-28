import { NextRequest, NextResponse } from "next/server";
import { copyFile } from "@/lib/drive";
import { sendWebhookNotification } from "@/lib/webhook";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, destinationId, newName } = body;

    if (!fileId || !destinationId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    const result = await copyFile(fileId, destinationId, newName);

    await sendWebhookNotification("File Copied", {
      fileId,
      destinationId,
      newName: result.name,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
