"use client";

import * as React from "react";
import { PackageOpenIcon } from "lucide-react";

import { formatDateTimeWib } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import type { MonitorAnalyticsRow } from "@/types/monitor-stok/monitor";
import { MONITOR_PAGE_SIZE_OPTIONS } from "./monitor-table-config";

interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type AnalyticsKind = "tidak-laku" | "paling-laku" | "perkiraan-habis";

interface MonitorAnalyticsTableProps {
  kind: AnalyticsKind;
  rows: MonitorAnalyticsRow[];
  meta: PageMeta;
  isLoading: boolean;
  isFetching: boolean;
  emptyText?: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (size: number) => void;
}

const _EXTRA_COLS: Record<AnalyticsKind, string[]> = {
  "tidak-laku": ["Terjual Terakhir", "Idle (hari)"],
  "paling-laku": ["Terjual", "Rata-rata/hari"],
  "perkiraan-habis": ["Rata-rata/hari", "Estimasi Hari", "Perkiraan Habis"],
};

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <div
      className="h-9 w-9 shrink-0 rounded-xl border border-border/40 bg-muted/40 bg-cover bg-center"
      role="img"
      aria-label={alt}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    />
  );
}

export function MonitorAnalyticsTable({
  kind,
  rows,
  meta,
  isLoading,
  isFetching,
  emptyText = "Tidak ada produk pada kategori ini.",
  onPageChange,
  onPerPageChange,
}: MonitorAnalyticsTableProps) {
  const columns = React.useMemo<ColumnDef<MonitorAnalyticsRow>[]>(() => {
    const baseCols: ColumnDef<MonitorAnalyticsRow>[] = [
      {
        accessorKey: "product_name",
        header: "Produk",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Thumb
              url={row.original.thumbnail}
              alt={row.original.product_name ?? row.original.sku}
            />
            <div className="min-w-0">
              <p
                className="truncate font-medium"
                title={row.original.product_name ?? ""}
              >
                {row.original.product_name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.original.sku}
              </p>
              {row.original.variation_values.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {row.original.variation_values.map((v, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-2xs font-normal"
                    >
                      {v.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "available",
        header: () => <div className="text-right">Tersedia</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {row.original.available}
          </div>
        ),
      },
    ];

    if (kind === "tidak-laku") {
      baseCols.push({
        accessorKey: "last_sold",
        header: () => <div className="text-right">Terjual Terakhir</div>,
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground">
            {row.original.last_sold ? (
              formatDateTimeWib(row.original.last_sold)
            ) : (
              <span className="text-warning">Belum pernah</span>
            )}
          </div>
        ),
      });
      baseCols.push({
        accessorKey: "days_idle",
        header: () => <div className="text-right">Idle (hari)</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.original.days_idle ?? "—"}
          </div>
        ),
      });
    } else if (kind === "paling-laku") {
      baseCols.push({
        accessorKey: "qty_sold",
        header: () => <div className="text-right">Terjual</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-semibold text-success">
            {row.original.qty_sold}
          </div>
        ),
      });
      baseCols.push({
        accessorKey: "avg_per_day",
        header: () => <div className="text-right">Rata-rata/hari</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.original.avg_per_day ?? "—"}
          </div>
        ),
      });
    } else {
      baseCols.push({
        accessorKey: "avg_per_day",
        header: () => <div className="text-right">Rata-rata/hari</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.original.avg_per_day ?? "—"}
          </div>
        ),
      });
      baseCols.push({
        accessorKey: "days_to_out",
        header: () => <div className="text-right">Estimasi Hari</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-semibold text-destructive">
            {row.original.days_to_out ?? "—"}
          </div>
        ),
      });
      baseCols.push({
        accessorKey: "estimated_date",
        header: () => <div className="text-right">Perkiraan Habis</div>,
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground">
            {formatDateTimeWib(row.original.estimated_date)}
          </div>
        ),
      });
    }

    return baseCols;
  }, [kind]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      isFetching={isFetching}
      pageSizeOptions={[...MONITOR_PAGE_SIZE_OPTIONS]}
      hideToolbar
      manualPagination
      pagination={{
        pageIndex: meta.current_page - 1,
        pageSize: meta.per_page,
      }}
      rowCount={meta.total}
      onPaginationChange={(p) => {
        onPageChange(p.pageIndex + 1);
        if (p.pageSize !== meta.per_page) onPerPageChange(p.pageSize);
      }}
      tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
      emptyState={
        <EmptyState
          icon={PackageOpenIcon}
          title={emptyText}
          className="py-20"
        />
      }
    />
  );
}
