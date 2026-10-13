import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => {
  const command = (name: string) =>
    class {
      readonly name = name;
      constructor(readonly input: Record<string, unknown>) {}
    };
  return {
    S3Client: class {
      send = send;
    },
    ListObjectsV2Command: command("ListObjectsV2"),
    GetObjectCommand: command("GetObject"),
    HeadObjectCommand: command("HeadObject"),
    PutObjectCommand: command("PutObject"),
    DeleteObjectCommand: command("DeleteObject"),
    CreateMultipartUploadCommand: command("CreateMultipartUpload"),
    UploadPartCommand: command("UploadPart"),
    CompleteMultipartUploadCommand: command("CompleteMultipartUpload"),
    AbortMultipartUploadCommand: command("AbortMultipartUpload"),
  };
});

import { S3StorageProvider } from "@/lib/storage/providers/s3";
import { UploadSessionError } from "@/lib/storage/providers/types";

type Sent = { name: string; input: Record<string, unknown> };
const MiB = 1024 * 1024;

function sent(name: string): Sent[] {
  return send.mock.calls
    .map((call) => call[0] as Sent)
    .filter((command) => command.name === name);
}

function chunk(bytes: number): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe("S3 multipart uploads (Z2-15)", () => {
  let provider: S3StorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STORAGE_S3_BUCKET = "bucket";
    send.mockImplementation(async (command: Sent) => {
      if (command.name === "CreateMultipartUpload") return { UploadId: "up-1" };
      if (command.name === "UploadPart") {
        return { ETag: `"etag-${command.input.PartNumber}"` };
      }
      return {};
    });
    provider = new S3StorageProvider();
  });

  it("gathers 2 MiB chunks into parts and completes the upload", async () => {
    const token = await provider.startUploadSession(
      "s3:videos/",
      "clip.mp4",
      "video/mp4",
    );
    expect(sent("CreateMultipartUpload")[0].input).toMatchObject({
      Bucket: "bucket",
      Key: "videos/clip.mp4",
      ContentType: "video/mp4",
    });

    for (let i = 0; i < 4; i++) {
      await provider.appendUploadSession(token, chunk(2 * MiB), i * 2 * MiB);
    }
    // 8 MiB buffered: the first part went out, nothing is held in memory.
    expect(sent("UploadPart")).toHaveLength(1);
    expect((sent("UploadPart")[0].input.Body as Buffer).length).toBe(8 * MiB);

    const file = await provider.finishUploadSession(token, chunk(MiB), 8 * MiB);

    const parts = sent("UploadPart");
    expect(parts).toHaveLength(2);
    expect((parts[1].input.Body as Buffer).length).toBe(MiB);
    expect(sent("CompleteMultipartUpload")[0].input).toMatchObject({
      Key: "videos/clip.mp4",
      UploadId: "up-1",
      MultipartUpload: {
        Parts: [
          { PartNumber: 1, ETag: '"etag-1"' },
          { PartNumber: 2, ETag: '"etag-2"' },
        ],
      },
    });
    expect(file).toMatchObject({
      id: "s3:videos/clip.mp4",
      size: String(9 * MiB),
      parents: ["s3:videos/"],
    });
  });

  it("uploads a file smaller than one part as a single part", async () => {
    const token = await provider.startUploadSession("s3:", "a.txt");

    const file = await provider.finishUploadSession(token, chunk(10), 0);

    expect(sent("UploadPart")).toHaveLength(1);
    expect(sent("CompleteMultipartUpload")).toHaveLength(1);
    expect(file?.id).toBe("s3:a.txt");
  });

  it("rejects a chunk that does not continue the upload", async () => {
    const token = await provider.startUploadSession("s3:", "a.bin");
    await provider.appendUploadSession(token, chunk(MiB), 0);

    const error = await provider
      .appendUploadSession(token, chunk(MiB), 3 * MiB)
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(UploadSessionError);
    expect((error as UploadSessionError).status).toBe(400);
  });

  it("answers 404 for an unknown session", async () => {
    const error = await provider
      .appendUploadSession("nope", chunk(1), 0)
      .catch((err: unknown) => err);

    expect((error as UploadSessionError).status).toBe(404);
  });

  it("aborts the multipart upload when completing fails", async () => {
    const token = await provider.startUploadSession("s3:", "a.bin");
    send.mockImplementation(async (command: Sent) => {
      if (command.name === "CompleteMultipartUpload") {
        throw new Error("boom");
      }
      return { ETag: '"e"' };
    });

    expect(await provider.finishUploadSession(token, chunk(5), 0)).toBeNull();
    expect(sent("AbortMultipartUpload")[0].input).toMatchObject({
      Key: "a.bin",
      UploadId: "up-1",
    });
  });

  it("aborts uploads left idle for 15 minutes", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    await provider.startUploadSession("s3:", "abandoned.bin");

    now.mockReturnValue(1_000_000 + 16 * 60 * 1000);
    await provider.startUploadSession("s3:", "next.bin");

    expect(sent("AbortMultipartUpload")[0].input).toMatchObject({
      Key: "abandoned.bin",
    });
    now.mockRestore();
  });
});
