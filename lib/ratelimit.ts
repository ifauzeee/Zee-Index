import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { NextRequest } from "next/server";

export const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export async function checkRateLimit(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  return await ratelimit.limit(ip);
}
