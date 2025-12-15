import React from "react";

interface OfficeViewerProps {
  fileUrl?: string;
  mimeType?: string;
  src?: string;
}

export function OfficeViewer({ fileUrl, mimeType, src }: OfficeViewerProps) {
  const officeMimes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
  ];

  const url = fileUrl || src || "";

  if (url && mimeType && !officeMimes.includes(mimeType)) return null;

  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <div className="w-full h-full min-h-[500px] border rounded bg-white">
      <iframe
        src={viewerUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
        title="Office Viewer"
      />
    </div>
  );
}

export default OfficeViewer;
