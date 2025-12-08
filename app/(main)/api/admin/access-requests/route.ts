import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { logActivity } from "@/lib/activityLogger";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const requests = await kv.smembers("zee-index:access-requests:v3");
    
    const parsedRequests = requests
      .map((r: any) => {
        try {
          if (typeof r === 'object' && r !== null) {
            return r;
          }

          if (typeof r === 'string') {
             if (r === "[object Object]") return null;
             return JSON.parse(r);
          }

          return null;
        } catch {
          return null;
        }
      })
      .filter((r) => r !== null);

    parsedRequests.sort((a: any, b: any) => b.timestamp - a.timestamp);
    
    return NextResponse.json(parsedRequests);
  } catch {
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
    
    let targetToRemove = null;

    for (const r of allRequests) {
        let parsed: any = r;
        
        if (typeof r === 'string') {
            try {
                if (r === "[object Object]") continue;
                parsed = JSON.parse(r);
            } catch { continue; }
        }
        
        if (parsed && 
            parsed.folderId === requestData.folderId && 
            parsed.email === requestData.email && 
            parsed.timestamp === requestData.timestamp) {
             targetToRemove = r; 
            break;
        }
    }

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

    if (targetToRemove) {
        await kv.srem("zee-index:access-requests:v3", targetToRemove);
    } else {
        try {
            await kv.srem("zee-index:access-requests:v3", requestData);
        } catch {}
    }

    try {
       await kv.srem("zee-index:access-requests:v3", "[object Object]");
    } catch {}

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}