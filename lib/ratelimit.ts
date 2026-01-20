import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@/lib/kv";
import { NextRequest } from "next/server";

export const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const downloadLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(50, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit/download",
});

export const adminLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit/admin",
});

export async function checkRateLimit(
  request: NextRequest,
  type: "general" | "download" = "general",
  identifier?: string,
) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  const finalId = identifier || ip;

  if (identifier?.startsWith("admin_")) {
    return await adminLimiter.limit(finalId);
  }

  const limiter = type === "download" ? downloadLimiter : ratelimit;
  return await limiter.limit(finalId);
}
