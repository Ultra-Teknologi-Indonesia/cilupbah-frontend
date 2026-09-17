"use client";

import * as React from "react";
import { PackageOpenIcon, PackagePlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ColumnDef, Table as TableInstance } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MonitorStockRow } from "@/types/monitor-stok/monitor";
import { MONITOR_PAGE_SIZE_OPTIONS } from "./monitor-table-config";

interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface MonitorStockTableProps {
  rows: MonitorStockRow[];
  meta: PageMeta;
  isLoading: boolean;
  isFetching: boolean;
  locationLabel: string;
  showRestock?: boolean;
  emptyText?: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (size: number) => void;
  enableQueueAction?: boolean;
  isQueueing?: boolean;
  onQueue?: (
    rows: MonitorStockRow[],
    table: TableInstance<MonitorStockRow>,
  ) => void;
  onQueueRow?: (row: MonitorStockRow) => void;
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

function parsePendingOrderNumbers(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((number) => number.trim())
    .filter(Boolean);
}

function PendingOrdersPopover({ orderNumbers }: { orderNumbers: string[] }) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openOnHoverOrFocus = React.useCallback(() => {
    cancelScheduledClose();
    setOpen(true);
  }, [cancelScheduledClose]);

  const scheduleClose = React.useCallback(() => {
    cancelScheduledClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 140);
  }, [cancelScheduledClose]);

  React.useEffect(
    () => () => {
      cancelScheduledClose();
    },
    [cancelScheduledClose],
  );

  const visibleOrderNumbers = orderNumbers.slice(5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="max-w-full cursor-help rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-left text-[10px] font-medium text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onPointerEnter={openOnHoverOrFocus}
          onPointerLeave={scheduleClose}
          onFocus={openOnHoverOrFocus}
          aria-label={`Lihat ${visibleOrderNumbers.length} pesanan lainnya`}
        >
          +{visibleOrderNumbers.length} lagi
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] max-h-[min(22rem,calc(100vh-2rem))] gap-3 overflow-x-hidden overflow-y-auto p-3"
        onPointerEnter={cancelScheduledClose}
        onPointerLeave={scheduleClose}
      >
        <PopoverHeader className="gap-0.5">
          <PopoverTitle className="text-sm font-semibold">
            Pesanan menunggu
          </PopoverTitle>
          <p className="text-xs text-muted-foreground">
            {orderNumbers.length} pesanan terkait produk ini
          </p>
        </PopoverHeader>
        <div className="grid min-w-0 gap-1.5">
          {orderNumbers.map((number, index) => (
            <div
              key={`${number}-${index}`}
              className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2"
            >
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {index + 1}.
              </span>
              <span className="min-w-0 break-all text-xs leading-4 text-foreground">
                {number}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MonitorStockTable({
  rows,
  meta,
  isLoading,
  isFetching,
  locationLabel,
  showRestock = false,
  emptyText = "Tidak ada produk pada kategori ini.",
  onPageChange,
  onPerPageChange,
  enableQueueAction = false,
  isQueueing = false,
  onQueue,
  onQueueRow,
}: MonitorStockTableProps) {
  const columns = React.useMemo<ColumnDef<MonitorStockRow>[]>(() => {
    const selectionColumn: ColumnDef<MonitorStockRow> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Pilih semua produk"
        />
      ),
      cell: ({ row }) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            disabled={!row.getCanSelect()}
            aria-label={`Pilih ${row.original.sku}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    };

    const baseCols: ColumnDef<MonitorStockRow>[] = [
      ...(enableQueueAction ? [selectionColumn] : []),
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
              {row.original.has_active_restock_request && (
                <Badge
                  variant="outline"
                  className="mt-1 text-2xs font-normal text-muted-foreground"
                >
                  Sudah diminta
                </Badge>
              )}
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
              {row.original.pending_order_nos && (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground/80">
                    Menunggu Pesanan:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const orders = parsePendingOrderNumbers(
                        row.original.pending_order_nos,
                      );
                      const maxToShow = 5;
                      const toShow = orders.slice(0, maxToShow);
                      const remaining = orders.length - maxToShow;

                      return (
                        <>
                          {toShow.map((no, idx) => (
                            <span
                              key={idx}
                              className="whitespace-nowrap rounded border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {no}
                            </span>
                          ))}
                          {remaining > 0 && (
                            <PendingOrdersPopover orderNumbers={orders} />
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "location",
        header: () => <div className="text-right">Lokasi</div>,
        cell: () => (
          <div className="text-right text-muted-foreground">
            {locationLabel}
          </div>
        ),
      },
      {
        accessorKey: "on_hand",
        header: () => <div className="text-right">On Hand</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.on_hand}</div>
        ),
      },
      {
        accessorKey: "on_order",
        header: () => <div className="text-right">On Order</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.on_order}</div>
        ),
      },
      {
        accessorKey: "available",
        header: () => <div className="text-right">Tersedia</div>,
        cell: ({ row }) => (
          <div
            className={cn(
              "text-right tabular-nums font-medium",
              row.original.available <= 0 ? "text-destructive" : "",
            )}
          >
            {row.original.available}
          </div>
        ),
      },
    ];

    if (showRestock) {
      baseCols.push({
        accessorKey: "qty_to_restock",
        header: () => <div className="text-right">Perlu Restock</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-semibold text-warning">
            {row.original.qty_to_restock}
          </div>
        ),
      });
    }

    if (enableQueueAction) {
      baseCols.push({
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                onQueueRow?.(row.original);
              }}
              disabled={isQueueing || row.original.has_active_restock_request}
              title={
                row.original.has_active_restock_request
                  ? "SKU sudah memiliki request aktif"
                  : undefined
              }
              className="whitespace-nowrap"
            >
              <PackagePlusIcon className="mr-1.5 h-4 w-4" />
              {row.original.has_active_restock_request
                ? "Sudah diminta"
                : "Masukkan ke restock"}
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 190,
      });
    }

    return baseCols;
  }, [enableQueueAction, isQueueing, locationLabel, onQueueRow, showRestock]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.item_id}
      enableRowSelection={
        enableQueueAction
          ? (row) => !row.original.has_active_restock_request
          : false
      }
      bulkActions={
        enableQueueAction
          ? (selected, table) => (
              <Button
                type="button"
                size="sm"
                onClick={() => onQueue?.(selected, table)}
                disabled={isQueueing}
              >
                <PackagePlusIcon className="mr-1.5 h-4 w-4" />
                {isQueueing ? "Memproses..." : "Masukkan ke permintaan restock"}
              </Button>
            )
          : undefined
      }
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
          title={emptyText}
        />
      }
    />
  );
}
