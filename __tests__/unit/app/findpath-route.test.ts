import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/drive", () => ({
  getAccessToken: vi.fn().mockResolvedValue("owner-token"),
  invalidateAccessToken: vi.fn(),
}));

import { GET } from "@/app/[locale]/findpath/route";

const fetchMock = vi.fn();

describe("/[locale]/findpath", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("looks up a Drive id and redirects to its page", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "file123",
          name: "My File",
          mimeType: "application/pdf",
          parents: ["parent1"],
        }),
        { status: 200 },
      ),
    );

    const response = await GET(
      new NextRequest("http://localhost/en/findpath?id=file123"),
    );

    expect(fetchMock.mock.calls[0][0]).toContain("/drive/v3/files/file123?");
    expect(response.headers.get("location")).toBe(
      "http://localhost/folder/parent1/file/file123/my-file",
    );
  });

  it.each(["x/permissions", "../../oauth2/v2/userinfo", "a%2Fb", "x y"])(
    "never sends %s to the Drive API",
    async (id) => {
      const response = await GET(
        new NextRequest(
          `http://localhost/en/findpath?id=${encodeURIComponent(id)}`,
        ),
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(response.headers.get("location")).toBe("http://localhost/");
    },
  );
});
