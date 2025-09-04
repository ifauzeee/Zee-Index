import { NextResponse } from 'next/server';
import { getStorageDetails } from '@/lib/googleDrive';

export const dynamic = 'force-dynamic'; // Ditambahkan
export const revalidate = 14400;

export async function GET() {
  try {
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