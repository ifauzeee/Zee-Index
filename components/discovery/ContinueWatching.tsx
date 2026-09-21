import Link from "next/link";
import { auth } from "@/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { getIcon } from "@/lib/utils";
import { getWatchProgressList } from "@/lib/watch-progress";

function createSlug(name: string) {
  return encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());
}

export default async function ContinueWatching() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || session?.user?.isGuest) return null;

  const list = await getWatchProgressList(email).catch(() => []);
  if (list.length === 0) return null;

  const locale = await getLocale();
  const t = await getTranslations("Discovery");

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {t("continueWatching")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {list.map((item) => {
          const Icon = getIcon(item.mimeType || "video/mp4");
          const href = item.folderId
            ? `/${locale}/folder/${encodeURIComponent(item.folderId)}/file/${encodeURIComponent(item.fileId)}/${createSlug(item.fileName)}`
            : null;
          const percent =
            item.duration > 0
              ? Math.min(100, Math.round((item.position / item.duration) * 100))
              : 0;
          const inner = (
            <>
              <Icon size={28} className="text-primary" />
              <span className="text-xs font-medium leading-tight line-clamp-2 break-all">
                {item.fileName}
              </span>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {percent}%
              </span>
            </>
          );
          return href ? (
            <Link
              key={item.fileId}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-accent"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={item.fileId}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
