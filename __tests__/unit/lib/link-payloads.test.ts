import { describe, expect, it } from "vitest";
import {
  parseAccessRequestRecord,
  parseFileRequestLink,
  parseShareCollectionItems,
  serializeAccessRequestRecord,
  shareCreateRequestSchema,
  shareTokenPayloadSchema,
} from "@/lib/link-payloads";

describe("link payload schemas", () => {
  it("serializes and parses access requests consistently", () => {
    const raw = serializeAccessRequestRecord({
      folderId: "folder-1",
      folderName: "Finance",
      email: "user@example.com",
      name: "Demo User",
      timestamp: 1710000000000,
    });

    expect(parseAccessRequestRecord(raw)).toEqual({
      folderId: "folder-1",
      folderName: "Finance",
      email: "user@example.com",
      name: "Demo User",
      timestamp: 1710000000000,
    });
  });

  it("ignores malformed legacy access request entries", () => {
    expect(parseAccessRequestRecord("[object Object]")).toBeNull();
    expect(parseAccessRequestRecord("{bad-json")).toBeNull();
  });

  it("parses file request records with optional creator metadata", () => {
    expect(
      parseFileRequestLink({
        token: "request-token",
        folderId: "folder-1",
        folderName: "Uploads",
        title: "Upload here",
        createdAt: 1710000000000,
        expiresAt: 1710003600000,
        createdBy: "admin@example.com",
        type: "file-request",
      }),
    ).toEqual({
      token: "request-token",
      folderId: "folder-1",
      folderName: "Uploads",
      title: "Upload here",
      createdAt: 1710000000000,
      expiresAt: 1710003600000,
      createdBy: "admin@example.com",
      type: "file-request",
    });
  });

  it("accepts collection share payloads with typed drive items", () => {
    expect(
      parseShareCollectionItems([
        {
          id: "file-1",
          name: "Document.pdf",
          mimeType: "application/pdf",
          modifiedTime: "2024-01-01T00:00:00.000Z",
          createdTime: "2024-01-01T00:00:00.000Z",
          webViewLink: "https://example.com/file-1",
          hasThumbnail: false,
          isFolder: false,
          trashed: false,
        },
      ]),
    ).toHaveLength(1);
  });

  it("requires either a direct path or collection items for share creation", () => {
    const invalid = shareCreateRequestSchema.safeParse({
      itemName: "Demo",
      type: "timed",
      expiresIn: "1h",
    });
    const valid = shareCreateRequestSchema.safeParse({
      itemName: "Shared collection",
      type: "session",
      expiresIn: "1d",
      items: [
        {
          id: "file-1",
          name: "Document.pdf",
          mimeType: "application/pdf",
          modifiedTime: "2024-01-01T00:00:00.000Z",
          createdTime: "2024-01-01T00:00:00.000Z",
          webViewLink: "https://example.com/file-1",
          hasThumbnail: false,
          isFolder: false,
          trashed: false,
        },
      ],
    });

    expect(invalid.success).toBe(false);
    expect(valid.success).toBe(true);
  });

  it("parses share token claims through the shared schema", () => {
    expect(
      shareTokenPayloadSchema.safeParse({
        jti: "share-1",
        exp: 1710003600,
        iat: 1710000000,
        loginRequired: true,
        preventDownload: true,
      }).success,
    ).toBe(true);
  });
});
