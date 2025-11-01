import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground col-span-full">
      <Loader2 className="h-12 w-12 text-primary animate-spin" />
      <p className="mt-4 text-sm">Memuat...</p>
    </div>
  );
}