import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCollectAccessTokens, mockIsAccessRestricted } = vi.hoisted(() => ({
  mockCollectAccessTokens: vi.fn(),
  mockIsAccessRestricted: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  collectAccessTokens: mockCollectAccessTokens,
}));
vi.mock("@/lib/securityUtils", () => ({
  isAccessRestricted: mockIsAccessRestricted,
}));

import { canModifyAll } from "@/lib/editor-access";

function session(role: "ADMIN" | "EDITOR"): Session {
  return {
    expires: "",
    user: { email: `${role.toLowerCase()}@example.com`, role },
  };
}

function request(): NextRequest {
  return new NextRequest("http://localhost/api/files/move", {
    headers: {
      cookie: "folder_token_secret=jwt",
      authorization: "Bearer bearer-jwt",
    },
  });
}

describe("canModifyAll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectAccessTokens.mockResolvedValue(["secret"]);
    mockIsAccessRestricted.mockResolvedValue(false);
  });

  it("lets admins modify anything without checking", async () => {
    expect(await canModifyAll(request(), session("ADMIN"), ["a", "b"])).toBe(
      true,
    );
    expect(mockIsAccessRestricted).not.toHaveBeenCalled();
  });

  it("checks every id once with the editor's tokens and email", async () => {
    expect(
      await canModifyAll(request(), session("EDITOR"), ["file", "src", "src"]),
    ).toBe(true);

    expect(mockCollectAccessTokens).toHaveBeenCalledWith(
      [{ name: "folder_token_secret", value: "jwt" }],
      "bearer-jwt",
    );
    expect(mockIsAccessRestricted).toHaveBeenCalledTimes(2);
    expect(mockIsAccessRestricted).toHaveBeenCalledWith(
      "file",
      ["secret"],
      "editor@example.com",
    );
  });

  it("refuses when any source or destination is restricted", async () => {
    mockIsAccessRestricted.mockImplementation(
      async (id: string) => id === "protected-dest",
    );

    expect(
      await canModifyAll(request(), session("EDITOR"), [
        "file",
        "public-src",
        "protected-dest",
      ]),
    ).toBe(false);
  });
});
