import React from "react";

interface OfficeViewerProps {
  src: string;
}

export const OfficeViewer: React.FC<OfficeViewerProps> = ({ src }) => {
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`;

  return (
    <div className="w-full h-full bg-white">
      <iframe
        src={viewerUrl}
        className="w-full h-full border-0"
        title="Office Document Preview"
        allowFullScreen
      />
    </div>
  );
};
