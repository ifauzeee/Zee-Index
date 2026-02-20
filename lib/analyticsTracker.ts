import { kv } from "@/lib/kv";

const PAGEVIEW_KEY = "zee-index:analytics:pageviews";
const VISITOR_KEY = "zee-index:analytics:visitors";
const DAILY_VIEWS_KEY = "zee-index:analytics:daily-views";
const DAILY_VISITORS_KEY = "zee-index:analytics:daily-visitors";
const POPULAR_PAGES_KEY = "zee-index:analytics:popular-pages";
const DEVICE_STATS_KEY = "zee-index:analytics:device-stats";
const REFERRER_KEY = "zee-index:analytics:referrers";
const BANDWIDTH_KEY = "zee-index:analytics:bandwidth";
const ACTIVE_VISITORS_KEY = "zee-index:analytics:active-visitors";

const LOG_EXPIRATION_SECONDS = 60 * 60 * 24 * 90;

export interface PageViewEvent {
  id: string;
  path: string;
  timestamp: number;
  visitorId: string;
  ip: string;
  userAgent: string;
  referrer: string;
  browser: string;
  os: string;
  device: string;
}

export interface AnalyticsData {
  overview: {
    viewsToday: number;
    viewsYesterday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
    visitorsToday: number;
    visitorsYesterday: number;
    visitorsThisWeek: number;
    visitorsThisMonth: number;
    activeNow: number;
  };
  hourlyViews: { hour: string; views: number; visitors: number }[];
  dailyTrend: { date: string; views: number; visitors: number }[];
  popularPages: { path: string; views: number }[];
  deviceBreakdown: {
    browsers: { name: string; count: number }[];
    os: { name: string; count: number }[];
    devices: { name: string; count: number }[];
  };
  topReferrers: { source: string; count: number }[];
  bandwidth: {
    totalToday: number;
    totalThisWeek: number;
    totalThisMonth: number;
    dailyTrend: { date: string; bytes: number }[];
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseUserAgent(ua: string): {
  browser: string;
  os: string;
  device: string;
} {
  let browser = "Other";
  let os = "Other";
  let device = "Desktop";

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/"))
    browser = "Safari";
  else if (ua.includes("bot") || ua.includes("Bot") || ua.includes("crawler"))
    browser = "Bot";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("CrOS")) os = "ChromeOS";

  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone"))
    device = "Mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) device = "Tablet";

  return { browser, os, device };
}

/**
 * Track a page view. Called from middleware or API route.
 */
export async function trackPageView(params: {
  path: string;
  ip: string;
  userAgent: string;
  referrer: string;
}): Promise<void> {
  try {
    const timestamp = Date.now();
    const dayKey = getDayKey(timestamp);
    const { browser, os, device } = parseUserAgent(params.userAgent);

    const raw = `${params.ip}:${params.userAgent}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const visitorId = `v-${Math.abs(hash).toString(36)}`;

    const event: PageViewEvent = {
      id: generateId(),
      path: params.path,
      timestamp,
      visitorId,
      ip: params.ip,
      userAgent: params.userAgent,
      referrer: params.referrer,
      browser,
      os,
      device,
    };

    await kv.zadd(PAGEVIEW_KEY, {
      score: timestamp,
      member: JSON.stringify(event),
    });

    await kv.incr(`${DAILY_VIEWS_KEY}:${dayKey}`);
    await kv.expire(`${DAILY_VIEWS_KEY}:${dayKey}`, LOG_EXPIRATION_SECONDS);

    await kv.sadd(`${VISITOR_KEY}:${dayKey}`, visitorId);
    await kv.expire(`${VISITOR_KEY}:${dayKey}`, LOG_EXPIRATION_SECONDS);

    const isNewVisitorToday = await kv.scard(`${VISITOR_KEY}:${dayKey}`);
    await kv.set(`${DAILY_VISITORS_KEY}:${dayKey}`, isNewVisitorToday, {
      ex: LOG_EXPIRATION_SECONDS,
    });

    await kv.zadd(ACTIVE_VISITORS_KEY, {
      score: timestamp,
      member: visitorId,
    });

    await kv.zadd(POPULAR_PAGES_KEY, {
      score: timestamp,
      member: JSON.stringify({ path: params.path, dayKey }),
    });

    await kv.zadd(DEVICE_STATS_KEY, {
      score: timestamp,
      member: JSON.stringify({ browser, os, device, dayKey }),
    });

    if (params.referrer && params.referrer !== "") {
      try {
        const refUrl = new URL(params.referrer);
        const source = refUrl.hostname || "Direct";
        await kv.zadd(REFERRER_KEY, {
          score: timestamp,
          member: JSON.stringify({ source, dayKey }),
        });
      } catch {}
    }

    const expirationTime = Date.now() - LOG_EXPIRATION_SECONDS * 1000;
    await Promise.all([
      kv.zremrangebyscore(PAGEVIEW_KEY, 0, expirationTime),
      kv.zremrangebyscore(ACTIVE_VISITORS_KEY, 0, expirationTime),
      kv.zremrangebyscore(POPULAR_PAGES_KEY, 0, expirationTime),
      kv.zremrangebyscore(DEVICE_STATS_KEY, 0, expirationTime),
      kv.zremrangebyscore(REFERRER_KEY, 0, expirationTime),
    ]);
  } catch (error) {
    console.error("[Analytics] Failed to track page view:", error);
  }
}

/**
 * Track bandwidth usage (call when a download occurs)
 */
export async function trackBandwidth(bytes: number): Promise<void> {
  try {
    const dayKey = getDayKey(Date.now());
    const currentKey = `${BANDWIDTH_KEY}:${dayKey}`;
    const current = await kv.get<number>(currentKey);
    await kv.set(currentKey, (current || 0) + bytes, {
      ex: LOG_EXPIRATION_SECONDS,
    });
  } catch (error) {
    console.error("[Analytics] Failed to track bandwidth:", error);
  }
}

/**
 * Get complete analytics data
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  const now = Date.now();
  const todayKey = getDayKey(now);
  const yesterdayKey = getDayKey(now - 86400000);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const viewsToday =
    (await kv.get<number>(`${DAILY_VIEWS_KEY}:${todayKey}`)) || 0;
  const viewsYesterday =
    (await kv.get<number>(`${DAILY_VIEWS_KEY}:${yesterdayKey}`)) || 0;
  const visitorsToday =
    (await kv.get<number>(`${DAILY_VISITORS_KEY}:${todayKey}`)) || 0;
  const visitorsYesterday =
    (await kv.get<number>(`${DAILY_VISITORS_KEY}:${yesterdayKey}`)) || 0;

  let viewsThisWeek = 0;
  let viewsThisMonth = 0;
  let visitorsThisWeek = 0;
  let visitorsThisMonth = 0;

  for (let i = 0; i < 30; i++) {
    const dayKey = getDayKey(now - i * 86400000);
    const dv = (await kv.get<number>(`${DAILY_VIEWS_KEY}:${dayKey}`)) || 0;
    const uv = (await kv.get<number>(`${DAILY_VISITORS_KEY}:${dayKey}`)) || 0;

    viewsThisMonth += dv;
    visitorsThisMonth += uv;

    if (i < 7) {
      viewsThisWeek += dv;
      visitorsThisWeek += uv;
    }
  }

  const fiveMinAgo = now - 5 * 60 * 1000;
  const activeMembers: string[] = await kv.zrange(
    ACTIVE_VISITORS_KEY,
    fiveMinAgo,
    now,
    { byScore: true },
  );
  const activeNow = new Set(activeMembers).size;

  const hourlyViews: { hour: string; views: number; visitors: number }[] =
    Array(24)
      .fill(0)
      .map((_, i) => ({
        hour: `${String(i).padStart(2, "0")}:00`,
        views: 0,
        visitors: 0,
      }));

  const todayEvents = await kv.zrange<string>(
    PAGEVIEW_KEY,
    todayStart.getTime(),
    now,
    { byScore: true },
  );

  const hourlyVisitorSets = new Map<number, Set<string>>();
  for (const rawEvent of todayEvents) {
    try {
      const event: PageViewEvent =
        typeof rawEvent === "string" ? JSON.parse(rawEvent) : rawEvent;
      const hour = new Date(event.timestamp).getHours();
      hourlyViews[hour].views++;

      if (!hourlyVisitorSets.has(hour)) hourlyVisitorSets.set(hour, new Set());
      hourlyVisitorSets.get(hour)!.add(event.visitorId);
    } catch {}
  }
  for (const [hour, visitors] of hourlyVisitorSets) {
    hourlyViews[hour].visitors = visitors.size;
  }

  const dailyTrend: { date: string; views: number; visitors: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayKey = getDayKey(now - i * 86400000);
    const dv = (await kv.get<number>(`${DAILY_VIEWS_KEY}:${dayKey}`)) || 0;
    const uv = (await kv.get<number>(`${DAILY_VISITORS_KEY}:${dayKey}`)) || 0;
    const d = new Date(now - i * 86400000);
    dailyTrend.push({
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      views: dv,
      visitors: uv,
    });
  }

  const thirtyDaysAgo = now - 30 * 86400000;
  const popularRaw: string[] = await kv.zrange(
    POPULAR_PAGES_KEY,
    thirtyDaysAgo,
    now,
    { byScore: true },
  );
  const pageCounts = new Map<string, number>();
  for (const raw of popularRaw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const path = parsed.path || "/";
      pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
    } catch {}
  }
  const popularPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  const deviceRaw: string[] = await kv.zrange(
    DEVICE_STATS_KEY,
    thirtyDaysAgo,
    now,
    { byScore: true },
  );
  const browserCounts = new Map<string, number>();
  const osCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();

  for (const raw of deviceRaw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      browserCounts.set(
        parsed.browser,
        (browserCounts.get(parsed.browser) || 0) + 1,
      );
      osCounts.set(parsed.os, (osCounts.get(parsed.os) || 0) + 1);
      deviceCounts.set(
        parsed.device,
        (deviceCounts.get(parsed.device) || 0) + 1,
      );
    } catch {}
  }

  const toSorted = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

  const referrerRaw: string[] = await kv.zrange(
    REFERRER_KEY,
    thirtyDaysAgo,
    now,
    { byScore: true },
  );
  const referrerCounts = new Map<string, number>();
  for (const raw of referrerRaw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      referrerCounts.set(
        parsed.source,
        (referrerCounts.get(parsed.source) || 0) + 1,
      );
    } catch {}
  }
  const topReferrers = Array.from(referrerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  let totalToday = 0;
  let totalThisWeek = 0;
  let totalThisMonth = 0;
  const bandwidthDailyTrend: { date: string; bytes: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const dayKey = getDayKey(now - i * 86400000);
    const bytes = (await kv.get<number>(`${BANDWIDTH_KEY}:${dayKey}`)) || 0;
    const d = new Date(now - i * 86400000);
    bandwidthDailyTrend.push({
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      bytes,
    });

    totalThisMonth += bytes;
    if (i < 7) totalThisWeek += bytes;
    if (i === 0) totalToday = bytes;
  }

  return {
    overview: {
      viewsToday,
      viewsYesterday,
      viewsThisWeek,
      viewsThisMonth,
      visitorsToday,
      visitorsYesterday,
      visitorsThisWeek,
      visitorsThisMonth,
      activeNow,
    },
    hourlyViews,
    dailyTrend,
    popularPages,
    deviceBreakdown: {
      browsers: toSorted(browserCounts),
      os: toSorted(osCounts),
      devices: toSorted(deviceCounts),
    },
    topReferrers,
    bandwidth: {
      totalToday,
      totalThisWeek,
      totalThisMonth,
      dailyTrend: bandwidthDailyTrend,
    },
  };
}
