import Link from "next/link";
import { SearchX } from "lucide-react";

export default function RootNotFound() {
  return (
    <main className="bg-background text-foreground min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-muted text-muted-foreground">
            <SearchX className="w-12 h-12" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Page Not Found
        </h1>

        <p className="text-muted-foreground">
          The page you are looking for does not exist.
        </p>

        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
