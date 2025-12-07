import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { logActivity } from "@/lib/activityLogger";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const requests = await kv.smembers("zee-index:access-requests:v3");
    
    const parsedRequests = requests
      .map((r: string) => {
        try {
          if (r === "[object Object]") return null;
          return JSON.parse(r);
        } catch (e) {
          console.error("Failed to parse request JSON:", r, e);
          return null;
        }
      })
      .filter((r) => r !== null);

    parsedRequests.sort((a: any, b: any) => b.timestamp - a.timestamp);
    
    return NextResponse.json(parsedRequests);
  } catch (error) {
    console.error("Failed to fetch access requests:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { action, requestData } = await req.json();
    
    const allRequests = await kv.smembers("zee-index:access-requests:v3");
    const targetString = allRequests.find((r) => {
      try {
        if (r === "[object Object]") return false;
        const parsed = JSON.parse(r);
        return parsed.folderId === requestData.folderId && 
               parsed.email === requestData.email && 
               parsed.timestamp === requestData.timestamp;
      } catch {
        return false;
      }
    });

    if (action === "approve") {
      await kv.sadd("zee-index:user-access:folders", requestData.folderId);
      await kv.sadd(`folder:access:${requestData.folderId}`, requestData.email);
      
      await logActivity("ADMIN_ADDED", {
        itemName: requestData.folderName,
        userEmail: session.user?.email,
        targetUser: requestData.email,
        status: "success"
      });
    }

    if (targetString) {
        await kv.srem("zee-index:access-requests:v3", targetString);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Access Request Action Error:", error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}