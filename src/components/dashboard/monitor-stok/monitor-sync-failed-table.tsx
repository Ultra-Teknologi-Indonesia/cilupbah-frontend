"use client";

import { useState, useMemo, useCallback } from "react";
import { RefreshCwIcon, CheckIcon } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useRetrySync,
  useRetryBulkSync,
} from "@/hooks/monitor-stok/use-monitor-stok";
import type { MonitorSyncFailedRow } from "@/types/monitor-stok/monitor";
import { MONITOR_PAGE_SIZE_OPTIONS } from "./monitor-table-config";

interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface MonitorSyncFailedTableProps {
  rows: MonitorSyncFailedRow[];
  meta: PageMeta;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (size: number) => void;
}

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

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="destructive" className="text-2xs font-medium">
      {status === "failed" ? "Gagal" : status}
    </Badge>
  );
}

export function MonitorSyncFailedTable({
  rows,
  meta,
  isLoading,
  isFetching,
  onPageChange,
  onPerPageChange,
}: MonitorSyncFailedTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [retryId, setRetryId] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  const retry = useRetrySync();
  const retryBulk = useRetryBulkSync();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = useCallback(() => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }, [selected, rows]);

  const handleRetry = () => {
    if (!retryId) return;
    retry.mutate(retryId, { onSettled: () => setRetryId(null) });
  };

  const handleBulk = () => {
    retryBulk.mutate([...selected], {
      onSettled: () => {
        setShowBulk(false);
        setSelected(new Set());
      },
    });
  };

  const columns = useMemo<ColumnDef<MonitorSyncFailedRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table: _table }) => (
          <Checkbox
            checked={selected.size === rows.length && rows.length > 0}
            onCheckedChange={toggleAll}
            aria-label="Pilih semua"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            aria-label={`Pilih ${row.original.product_name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "product_name",
        header: "Produk",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Thumb
              url={row.original.thumbnail}
              alt={row.original.product_name ?? row.original.sku ?? "—"}
            />
            <div className="min-w-0">
              <p
                className="truncate font-medium"
                title={row.original.product_name ?? ""}
              >
                {row.original.product_name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.original.sku ?? "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "channel_shop",
        header: "Channel / Toko",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium">
              {row.original.channel_name ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.shop_name ?? "—"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "sync_status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.sync_status} />,
      },
      {
        accessorKey: "error_message",
        header: "Error",
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <p
              className="truncate text-xs text-destructive"
              title={row.original.error_message ?? ""}
            >
              {row.original.error_message ?? "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "last_synced_at",
        header: "Terakhir Sync",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {formatDateTime(row.original.last_synced_at)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRetryId(row.original.id)}
              disabled={retry.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <RefreshCwIcon className="size-3" /> Retry
            </button>
          </div>
        ),
      },
    ],
    [rows, selected, retry.isPending, toggleAll],
  );

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} dipilih
          </span>
          <button
            type="button"
            onClick={() => setShowBulk(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCwIcon className="size-3.5" /> Retry Semua
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Batal
          </button>
        </div>
      )}

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
            icon={CheckIcon}
            className="py-20"
            title="Tidak ada mapping gagal sync."
          />
        }
      />

      <ConfirmDialog
        open={retryId !== null}
        onOpenChange={(o) => {
          if (!o) setRetryId(null);
        }}
        title="Retry Sinkronisasi"
        description="Mapping ini akan dijadwalkan ulang untuk sinkronisasi ke channel. Lanjutkan?"
        confirmLabel="Retry"
        onConfirm={handleRetry}
        loading={retry.isPending}
      />

      <ConfirmDialog
        open={showBulk}
        onOpenChange={setShowBulk}
        title="Retry Semua yang Dipilih"
        description={`${selected.size} mapping akan dijadwalkan ulang untuk sinkronisasi. Lanjutkan?`}
        confirmLabel="Retry Semua"
        onConfirm={handleBulk}
        loading={retryBulk.isPending}
      />
    </div>
  );
}
