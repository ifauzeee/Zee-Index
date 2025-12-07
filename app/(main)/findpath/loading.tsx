import { Loader2 } from "lucide-react";

export default function FindPathLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Mencari Lokasi...</h2>
        <p className="text-sm text-muted-foreground">
          Sedang memindai struktur folder.
        </p>
      </div>
    </div>
  );
}
