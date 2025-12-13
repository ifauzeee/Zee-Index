import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@/lib/kv";
import { NextRequest } from "next/server";

export const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const downloadLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit/download",
});

export async function checkRateLimit(
  request: NextRequest,
  type: "general" | "download" = "general",
) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : (request.ip ?? "127.0.0.1");
  const limiter = type === "download" ? downloadLimiter : ratelimit;
  return await limiter.limit(ip);
}
