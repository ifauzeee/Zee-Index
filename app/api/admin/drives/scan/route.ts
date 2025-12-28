import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { listSharedDrives, listSharedWithMeFolders } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const [teamDrives, sharedFolders] = await Promise.all([
      listSharedDrives(),
      listSharedWithMeFolders(),
    ]);

    const formattedTeamDrives = teamDrives.map((d) => ({
      id: d.id,
      name: d.name,
      kind: "teamDrive",
    }));

    const formattedSharedFolders = sharedFolders.map((f) => ({
      id: f.id,
      name: f.name,
      kind: "sharedFolder",
      owner: f.owners?.[0]?.displayName || "Unknown",
    }));

    return NextResponse.json([
      ...formattedTeamDrives,
      ...formattedSharedFolders,
    ]);
  } catch (error) {
    console.error("Failed to scan drives:", error);
    return NextResponse.json(
      { error: "Failed to scan drives" },
      { status: 500 },
    );
  }
}
