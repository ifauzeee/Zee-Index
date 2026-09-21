import { z } from "zod";
import { NextResponse } from "next/server";
import { createUserRoute } from "@/lib/api-middleware";
import {
  getWatchProgressList,
  upsertWatchProgress,
} from "@/lib/watch-progress";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  fileId: z.string().min(1).max(400),
  fileName: z.string().min(1).max(500),
  position: z.number().min(0),
  duration: z.number().min(0).max(86400).optional(),
});

export const GET = createUserRoute(
  async ({ session }) => {
    const list = await getWatchProgressList(session.user.email as string);
    return NextResponse.json({ items: list });
  },
  { requireEmail: true },
);

export const PUT = createUserRoute(
  async ({ session, body }) => {
    await upsertWatchProgress(session.user.email as string, body);
    return NextResponse.json({ ok: true });
  },
  { bodySchema: upsertSchema, requireEmail: true },
);
