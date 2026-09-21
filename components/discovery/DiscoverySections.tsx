import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getIcon } from "@/lib/utils";
import type { DiscoveryFile, DiscoveryTopDownload } from "@/lib/discovery";

function createSlug(name: string) {
  return encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());
}

function fileHref(
  locale: string,
  file: { id: string; name: string; folderId: string },
) {
  return `/${locale}/folder/${encodeURIComponent(file.folderId)}/file/${encodeURIComponent(file.id)}/${createSlug(file.name)}`;
}

export default async function DiscoverySections({
  recent,
  top,
}: {
  recent: DiscoveryFile[];
  top: DiscoveryTopDownload[];
}) {
  const locale = await getLocale();
  const t = await getTranslations("Discovery");

  if (recent.length === 0 && top.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 mb-6">
      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("recentlyAdded")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {recent.map((file) => {
              const Icon = getIcon(file.mimeType);
              return (
                <Link
                  key={file.id}
                  href={fileHref(locale, file)}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-accent"
                >
                  <Icon size={28} className="text-primary" />
                  <span className="text-xs font-medium leading-tight line-clamp-2 break-all">
                    {file.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {top.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("topDownloads")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {top.map((file) => {
              const Icon = getIcon(file.itemType || "application/octet-stream");
              const href = file.folderId
                ? fileHref(locale, {
                    id: file.itemId,
                    name: file.itemName,
                    folderId: file.folderId,
                  })
                : null;
              const inner = (
                <>
                  <Icon size={28} className="text-primary" />
                  <span className="text-xs font-medium leading-tight line-clamp-2 break-all">
                    {file.itemName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {file.count}×
                  </span>
                </>
              );
              return href ? (
                <Link
                  key={file.itemId}
                  href={href}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-accent"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={file.itemId}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
