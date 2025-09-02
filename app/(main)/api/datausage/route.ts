// app/(main)/api/datausage/route.ts
import { NextResponse } from 'next/server';
import { getStorageDetails } from '@/lib/googleDrive'; // <-- Use the new function

export const revalidate = 14400; // Cache this for 4 hours

export async function GET() {
  try {
    // Call the new function that gets all storage details
    const storageDetails = await getStorageDetails();
    
    // Return only the totalUsage part, as before
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