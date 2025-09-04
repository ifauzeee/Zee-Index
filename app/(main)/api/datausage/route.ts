import { NextResponse } from 'next/server';
import { getStorageDetails } from '@/lib/googleDrive';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export const revalidate = 14400; // Cache this for 4 hours

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // Hanya pengguna yang login yang bisa melihat penggunaan data
    if (!session) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const storageDetails = await getStorageDetails();
    
    return NextResponse.json({
      totalUsage: storageDetails.usage 
    });
  } catch (error: any) {
    console.error("Data Usage API Error:", error.message);
    return NextResponse.json(
      { error: "Failed to calculate data usage.", details: error.message },
      { status: 500 }
    );
  }
}