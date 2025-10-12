import { NextResponse } from 'next/server';
import { getStorageDetails } from '@/lib/googleDrive';

; 
export const revalidate = 14400;

export async function GET() {
  try {
    const details = await getStorageDetails();
    return NextResponse.json(details);
  } catch (error: any) {
    console.error('Storage Details API Error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil detail penyimpanan.', details: error.message },
      { status: 500 }
    );
  }
}