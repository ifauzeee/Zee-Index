"use client";

import type { ReactNode } from "react";
import { TableSkeleton } from "@/components/admin/skeletons";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** Custom render. Defaults to String(item[key]). */
  render?: (item: T) => ReactNode;
  /** Hide this column on mobile (< 768px). */
  hideOnMobile?: boolean;
  /** Class on the <td>/card value. */
  cellClassName?: string;
  /** Class on the <th>/card label. */
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  /** Shown when loading=false and data is empty. */
  emptyState?: ReactNode;
  /** Optional action row rendered per item on mobile card. */
  mobileActions?: (item: T) => ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  skeletonRows = 6,
  emptyState,
  mobileActions,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-card border rounded-xl overflow-hidden">
        <TableSkeleton rows={skeletonRows} columns={columns.length} />
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn("px-5 py-4", col.headerClassName)}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-5 py-4 text-sm", col.cellClassName)}
                    >
                      {col.render
                        ? col.render(item)
                        : String(
                            (item as Record<string, unknown>)[col.key] ?? "",
                          )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="bg-card border rounded-xl p-4 space-y-2"
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-2"
                >
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {col.header}
                  </span>
                  <span
                    className={cn(
                      "text-sm text-right font-medium break-words max-w-[65%]",
                      col.cellClassName,
                    )}
                  >
                    {col.render
                      ? col.render(item)
                      : String(
                          (item as Record<string, unknown>)[col.key] ?? "",
                        )}
                  </span>
                </div>
              ))}
            {mobileActions && (
              <div className="flex gap-2 pt-2 border-t border-border mt-2">
                {mobileActions(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
