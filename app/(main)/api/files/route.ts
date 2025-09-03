// app/(main)/api/files/route.ts
import { NextResponse } from 'next/server';
import { listFilesFromDrive } from '@/lib/googleDrive';
import { isPrivateFolder, isProtected, verifyFolderToken } from '@/lib/auth';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions"; // <-- PERBARUI IMPORT INI

// ... sisa kode file ini tetap sama ...
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // ...
}