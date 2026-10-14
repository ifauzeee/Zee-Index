import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (handler: () => Promise<Response>) => handler,
}));

import { GET } from "@/app/api/setup/status/route";

const KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_ROOT_FOLDER_ID",
] as const;
function request() {
  return new NextRequest("http://localhost:3000/api/setup/status");
}

const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

describe("GET /api/setup/status", () => {
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("reports env values without ever returning the client secret", async () => {
    process.env.GOOGLE_CLIENT_ID = "id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "GOCSPX-very-secret";
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID = "root123";

    const response = await GET(request());
    const text = await response.text();

    expect(JSON.parse(text)).toEqual({
      clientId: "id.apps.googleusercontent.com",
      rootFolderId: "root123",
      hasClientSecret: true,
    });
    expect(text).not.toContain("GOCSPX");
  });

  it("reports missing values as empty", async () => {
    for (const key of KEYS) process.env[key] = "";

    expect(await (await GET(request())).json()).toEqual({
      clientId: null,
      rootFolderId: null,
      hasClientSecret: false,
    });
  });
});
