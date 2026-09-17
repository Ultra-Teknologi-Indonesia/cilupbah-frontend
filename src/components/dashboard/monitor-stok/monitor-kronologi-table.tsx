"use client";

import { useMemo } from "react";
import { PackageOpenIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import type { KronologiRow } from "@/types/monitor-stok/monitor";
import { MONITOR_PAGE_SIZE_OPTIONS } from "./monitor-table-config";

interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface MonitorKronologiTableProps {
  rows: KronologiRow[];
  meta: PageMeta;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (size: number) => void;
  emptyText?: string;
}

const CATEGORY_STYLE: Record<string, string> = {
  BILL: "bg-blue-100 text-blue-700 border-blue-200",
  ADJUSTMENT: "bg-amber-100 text-amber-700 border-amber-200",
  PURCHASE_RETURN: "bg-purple-100 text-purple-700 border-purple-200",
  SALES_RETURN: "bg-purple-100 text-purple-700 border-purple-200",
  PICKING: "bg-sky-100 text-sky-700 border-sky-200",
  PESANAN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PESANAN_BATAL: "bg-red-100 text-red-700 border-red-200",
  INVOICE: "bg-rose-100 text-rose-700 border-rose-200",
  TRANSFER: "bg-slate-100 text-slate-700 border-slate-200",
  REVALUATION: "bg-orange-100 text-orange-700 border-orange-200",
  OTHER: "bg-muted text-muted-foreground border-border/60",
};

function QtyCell({ qty }: { qty: number }) {
  const positive = qty > 0;
  const zero = qty === 0;
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        zero
          ? "text-muted-foreground"
          : positive
            ? "text-success"
            : "text-destructive",
      )}
    >
      {positive ? "+" : ""}
      {qty.toLocaleString("id-ID")}
    </span>
  );
}

export function MonitorKronologiTable({
  rows,
  meta,
  isLoading,
  isFetching,
  onPageChange,
  onPerPageChange,
  emptyText,
}: MonitorKronologiTableProps) {
  const columns = useMemo<ColumnDef<KronologiRow>[]>(
    () => [
      {
        accessorKey: "transaction_date",
        header: "Tanggal",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {formatDateTime(row.original.transaction_date)}
          </span>
        ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.sku ?? "—"}</span>
        ),
      },
      {
        accessorKey: "location_name",
        header: "Lokasi",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.location_name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "bin_code",
        header: "Rak",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.bin_code ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "source_label",
        header: "Jenis",
        cell: ({ row }) => {
          const r = row.original;
          const style =
            CATEGORY_STYLE[r.source_category] ?? CATEGORY_STYLE.OTHER;
          return (
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("border text-2xs font-medium", style)}
              >
                {r.source_label}
              </Badge>
              {r.is_variance && (
                <Badge
                  variant="outline"
                  className="border-destructive/20 bg-destructive/10 text-2xs font-medium text-destructive"
                >
                  Variance
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "qty",
        header: () => <span className="block text-right">Qty</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <QtyCell qty={row.original.qty} />
          </div>
        ),
      },
      {
        accessorKey: "balance",
        header: () => (
          <span className="block text-right">Saldo saat kejadian</span>
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {row.original.balance.toLocaleString("id-ID")}
          </div>
        ),
      },
      {
        accessorKey: "current_balance",
        header: () => <span className="block text-right">Stok saat ini</span>,
        cell: ({ row }) => (
          <div className="text-right text-sm font-semibold tabular-nums">
            {(row.original.current_balance ?? 0).toLocaleString("id-ID")}
          </div>
        ),
      },
      {
        accessorKey: "transaction_number",
        header: "No. Transaksi",
        cell: ({ row }) => {
          const r = row.original;
          const isPick =
            r.source === "PICKING" || r.source === "PICKING_REVERSAL";
          return (
            <span
              className="font-mono text-xs text-muted-foreground"
              title={
                (isPick && r.order_no ? r.transaction_number : null) ??
                undefined
              }
            >
              {(isPick && r.order_no ? r.order_no : r.transaction_number) ??
                "—"}
            </span>
          );
        },
      },
    ],
    [],
  );

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
          className="py-20"
          title={emptyText ?? "Belum ada pergerakan stok pada rentang ini."}
        />
      }
    />
  );
}
