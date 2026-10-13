import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { OfficeViewer } from "@/components/file-details/OfficeViewer";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ORIGIN = "https://zee.example.com";

function viewerSrc(): string | null {
  return document.querySelector("iframe")?.getAttribute("src") ?? null;
}

describe("OfficeViewer", () => {
  it("previews Drive files with Drive's own viewer", () => {
    render(
      <OfficeViewer
        fileId="1AbC_def-123"
        fileUrl={`${ORIGIN}/api/download?fileId=1AbC_def-123`}
        mimeType={DOCX}
      />,
    );

    expect(viewerSrc()).toBe(
      "https://drive.google.com/file/d/1AbC_def-123/preview",
    );
  });

  it("does not treat provider ids as Drive ids", () => {
    const url = `${ORIGIN}/api/download?fileId=s3%3Adocs%2Fa.docx`;
    render(
      <OfficeViewer fileId="s3:docs/a.docx" fileUrl={url} mimeType={DOCX} />,
    );

    expect(viewerSrc()).toBe(
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`,
    );
  });

  it.each(["access_token", "share_token", "token"])(
    "keeps a URL carrying %s away from Office Online",
    (param) => {
      render(
        <OfficeViewer
          fileId="local-storage:secret/a.docx"
          fileUrl={`${ORIGIN}/api/download?fileId=local-storage%3Asecret%2Fa.docx&${param}=abc`}
          mimeType={DOCX}
        />,
      );

      expect(viewerSrc()).toBeNull();
      expect(screen.getByText("officeUnavailableTitle")).toBeTruthy();
      expect(
        screen.getByText("download").closest("a")?.getAttribute("href"),
      ).toContain(`${param}=abc`);
    },
  );
});
