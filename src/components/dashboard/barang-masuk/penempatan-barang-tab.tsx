"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo, useCallback } from "react";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import Link from "next/link";
import type { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  DownloadIcon,
  PrinterIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Progress } from "@/components/ui/progress";
import type { ColumnDef, Table as TableInstance } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  usePutaways,
  usePutawayBulkPdfAsync,
} from "@/hooks/barang-masuk/use-putaway";
import {
  useDeletePutaway,
  useBulkDeletePutaway,
} from "@/hooks/barang-masuk/use-putaway-actions";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { exportCsv } from "@/lib/export-csv";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { getStatusMeta } from "@/lib/status";
import type { Putaway } from "@/types/barang-masuk/putaway";
import { formatDateTimeWib } from "@/lib/format";
import { usePermissions } from "@/hooks/auth/use-permissions";

function ProgressBar({ placed, total }: { placed: number; total: number }) {
  const pct = total > 0 ? Math.round((placed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className="h-1.5 w-16" />
      <span className="text-xs tabular-nums text-muted-foreground">
        {placed} / {total}
      </span>
    </div>
  );
}

const STATUS_TABS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ALL"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

interface FilterState {
  location_id: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = {
  location_id: "",
  date_from: "",
  date_to: "",
};

function toDateStr(date?: Date): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateStr(value: string): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function handleExportPutaway(items: Putaway[]) {
  const headers = [
    "No. Penempatan",
    "Tgl. Penempatan",
    "Lokasi",
    "Dibuat Oleh",
    "Dikerjakan Oleh",
    "Total Qty",
    "Qty Placed",
    "Status",
  ];
  const rows = items.map((item) => {
    const totalQty = item.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
    const placedQty = item.items?.reduce((s, i) => s + i.putaway_qty, 0) ?? 0;
    return [
      item.putaway_no,
      formatDateTimeWib(item.started_at ?? item.created_at),
      item.location?.location_name ?? "",
      item.created_by,
      item.assignee?.name ?? "",
      String(totalQty),
      String(placedQty),
      getStatusMeta("putaway", item.status).label,
    ];
  });
  exportCsv(
    `penempatan-barang-${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows,
  );
}

function primaryAction(item: Putaway): { label: string; href: string } {
  if (item.status === "COMPLETED") {
    return {
      label: "Lihat",
      href: `/dashboard/barang-masuk/penempatan/${item.id}`,
    };
  }
  const href = `/dashboard/barang-masuk/putaway/${item.id}`;
  return item.status === "IN_PROGRESS"
    ? { label: "Lanjutkan", href }
    : { label: "Mulai", href };
}

function deleteDescription(p: Putaway | null): string {
  if (!p) return "";
  const no = p.putaway_no;
  switch (p.status) {
    case "NOT_STARTED":
      return `Hapus penempatan "${no}"? Dokumen dihapus dan penerimaan dikembalikan (data QC tetap tersimpan).`;
    case "IN_PROGRESS":
      return `Reset penempatan "${no}"? Semua stok yang sudah ditempatkan dikembalikan ke rak asal dan status kembali ke Belum Mulai.`;
    case "COMPLETED":
      return `Batalkan penyelesaian "${no}"? Semua stok dikembalikan dari rak dan status kembali ke Sedang Diproses.`;
    default:
      return `Hapus penempatan "${no}"?`;
  }
}

const sortByStatus: Record<string, string> = {
  COMPLETED: "-completed_at",
  IN_PROGRESS: "-started_at",
};

export function PenempatanBarangTab() {
  const { can } = usePermissions();
  const canEditPutaway = can("edit-penempatan");
  const canDeletePutaway = can("delete-penempatan");
  const canExportPutaway = can("export-penempatan");
  const router = useRouter();
  const bulkPdfMut = usePutawayBulkPdfAsync();
  const [statusTab, setStatusTab] = useUrlTab<StatusTab>(
    "status",
    "NOT_STARTED",
    {
      validValues: STATUS_TABS,
      clearKeys: ["penempatan_page"],
    },
  );
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: "penempatan",
  });
  const [deleteTarget, setDeleteTarget] = useState<Putaway | null>(null);
  const [bulkDeleteState, setBulkDeleteState] = useState<{
    ids: string[];
    onDone: () => void;
  } | null>(null);

  const deleteMut = useDeletePutaway();
  const bulkDeleteMut = useBulkDeletePutaway();

  const sortParam = useMemo(() => {
    const sort = list.sorting[0];
    if (!sort) {
      return statusTab !== "ALL"
        ? (sortByStatus[statusTab] ?? undefined)
        : undefined;
    }
    const field =
      sort.id === "tanggal"
        ? statusTab === "COMPLETED"
          ? "completed_at"
          : statusTab === "IN_PROGRESS"
            ? "started_at"
            : "created_at"
        : sort.id;
    return `${sort.desc ? "-" : ""}${field}`;
  }, [list.sorting, statusTab]);

  const params = useMemo(
    () => ({
      search: list.debouncedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      "filter[status]": statusTab === "ALL" ? undefined : statusTab,
      "filter[location_id]": list.filters.location_id || undefined,
      "filter[date_from]": list.filters.date_from || undefined,
      "filter[date_to]": list.filters.date_to || undefined,
      sort: sortParam,
    }),
    [
      list.debouncedSearch,
      list.page,
      list.perPage,
      list.filters.location_id,
      list.filters.date_from,
      list.filters.date_to,
      statusTab,
      sortParam,
    ],
  );

  const dateRange: DateRange | undefined = useMemo(() => {
    const from = parseDateStr(list.filters.date_from);
    const to = parseDateStr(list.filters.date_to);
    return from || to ? { from, to } : undefined;
  }, [list.filters.date_from, list.filters.date_to]);

  const { data, isLoading, isFetching } = usePutaways(params);
  const { data: locData } = useLocations({ perPage: 100 });

  const items = data?.items ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: list.perPage,
    total: 0,
  };

  const locationOptions = useMemo(
    () => [
      { value: "", label: "Semua Lokasi" },
      ...(locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    ],
    [locData],
  );

  const activeStatus = statusTab === "ALL" ? "" : statusTab;

  const columns = useMemo<ColumnDef<Putaway>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Pilih semua"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Pilih baris"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        accessorKey: "putaway_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Penempatan" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.putaway_no}</span>
        ),
      },
      {
        id: "no_pembelian",
        accessorFn: (row) => {
          const sources = row.sources;
          return (
            sources?.[0]?.reference_number ??
            row.inbound?.reference_number ??
            ""
          );
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Penerimaan" />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const sources = row.original.sources;
          const ref =
            sources?.[0]?.reference_number ??
            row.original.inbound?.reference_number;
          return <span className="text-foreground">{ref ?? "—"}</span>;
        },
      },
      {
        id: "tanggal",
        accessorFn: (r) =>
          activeStatus === "COMPLETED"
            ? r.completed_at
            : activeStatus === "IN_PROGRESS"
              ? r.started_at
              : r.created_at,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={
              activeStatus === "COMPLETED"
                ? "Tgl. Selesai"
                : activeStatus === "IN_PROGRESS"
                  ? "Tgl. Mulai"
                  : "Tgl. Dibuat"
            }
          />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const r = row.original;
          const date =
            activeStatus === "COMPLETED"
              ? r.completed_at
              : activeStatus === "IN_PROGRESS"
                ? r.started_at
                : r.created_at;
          return (
            <span className="text-foreground">
              {date ? formatDateTimeWib(date) : "—"}
            </span>
          );
        },
      },
      {
        id: "location",
        header: "Lokasi",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.location?.location_name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "created_by",
        header: "Dibuat Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.creator?.name ?? row.original.created_by}
          </span>
        ),
      },
      {
        id: "assignee",
        header: "Dikerjakan Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.assignee?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "notes",
        header: "Keterangan",
        cell: ({ row }) => (
          <span
            className="text-muted-foreground truncate max-w-[200px] block"
            title={row.original.notes ?? ""}
          >
            {row.original.notes ?? "—"}
          </span>
        ),
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }) => {
          const totalQty =
            row.original.items?.reduce(
              (s: number, i: { qty: number }) => s + i.qty,
              0,
            ) ?? 0;
          const placedQty =
            row.original.items?.reduce(
              (s: number, i: { putaway_qty: number }) => s + i.putaway_qty,
              0,
            ) ?? 0;
          return <ProgressBar placed={placedQty} total={totalQty} />;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge domain="putaway" status={row.original.status} />
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          const action = primaryAction(item);
          return (
            <div
              className="flex items-center justify-end gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {item.status === "COMPLETED" || canEditPutaway ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ) : null}
              {canExportPutaway && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Cetak Putaway"
                      >
                        <Link
                          href={`/dashboard/document-preview/putaway/${item.id}`}
                        >
                          <PrinterIcon className="size-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cetak Laporan Putaway</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Hapus"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Hapus / Reset Penempatan</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
    ],
    [activeStatus, canEditPutaway, canExportPutaway],
  );

  const bulkActions = useCallback(
    (selected: Putaway[], table: TableInstance<Putaway>) => {
      const ids = selected.map((r) => r.id);
      return (
        <>
          {canExportPutaway && (
            <Button
              size="sm"
              variant="outline"
              disabled={bulkPdfMut.isPending || ids.length === 0}
              onClick={() => {
                bulkPdfMut.mutate(ids, {
                  onSuccess: ({ export_id }) =>
                    router.push(
                      `/dashboard/document-preview/putaway-bulk-export/${encodeURIComponent(export_id)}`,
                    ),
                  onError: (error) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Gagal memulai export putaway.",
                    ),
                });
              }}
              title="Cetak dokumen terpilih"
            >
              <PrinterIcon className="mr-1.5 size-4" />
              Cetak {ids.length}
            </Button>
          )}
          {canDeletePutaway && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setBulkDeleteState({
                  ids,
                  onDone: () => table.resetRowSelection(),
                })
              }
            >
              <Trash2Icon className="mr-1.5 size-4" />
              Hapus {ids.length}
            </Button>
          )}
        </>
      );
    },
    [canDeletePutaway, canExportPutaway, router, bulkPdfMut],
  );

  return (
    <>
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3 sm:px-5">
          <Tabs
            value={statusTab}
            onValueChange={(val) => setStatusTab(val as StatusTab)}
          >
            <TabsList variant="line" className="h-auto">
              <TabsTrigger value="NOT_STARTED">Belum Mulai</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">Sedang Diproses</TabsTrigger>
              <TabsTrigger value="COMPLETED">Selesai</TabsTrigger>
              <TabsTrigger value="ALL">Semua</TabsTrigger>
            </TabsList>
          </Tabs>

          {items.length > 0 && canExportPutaway && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportPutaway(items)}
            >
              <DownloadIcon className="mr-1.5 size-4" />
              Export CSV
            </Button>
          )}
        </div>

        <FilterToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Cari nomor atau nama pembuat/pelaksana..."
          align="end"
          onReset={
            list.hasActiveFilter || !!list.search ? list.resetAll : undefined
          }
          hasFilter={list.hasActiveFilter || !!list.search}
          activeCount={list.activeFilterCount}
          gridCols={1}
        >
          <Combobox
            options={locationOptions}
            value={list.filters.location_id}
            onChange={(v) =>
              list.setFilters({ ...list.filters, location_id: v ?? "" })
            }
            placeholder="Lokasi"
            searchPlaceholder="Cari lokasi"
            className="h-9 bg-background"
          />
          <DateRangePicker
            value={dateRange}
            onChange={(range) =>
              list.setFilters({
                ...list.filters,
                date_from: toDateStr(range?.from),
                date_to: toDateStr(range?.to),
              })
            }
            placeholder="Rentang tanggal dibuat"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        <div className="px-5 py-5 sm:px-6">
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            isFetching={isFetching}
            hideToolbar
            manualPagination
            manualSorting
            sorting={list.sorting}
            onSortingChange={list.setSorting}
            enableRowSelection={canDeletePutaway}
            getRowId={(row) => row.id}
            bulkActions={bulkActions}
            pagination={list.pagination}
            rowCount={meta.total}
            onPaginationChange={list.onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={ArchiveIcon}
                title="Belum ada penempatan barang"
                description="Dokumen penempatan ke rak akan tampil di sini setelah
                    penerimaan."
              />
            }
          />
        </div>
      </LiquidGlass>

      {canDeletePutaway && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
          title="Hapus / Reset Penempatan"
          description={deleteDescription(deleteTarget)}
          confirmLabel={
            deleteTarget?.status === "NOT_STARTED" ? "Hapus" : "Reset"
          }
          variant="destructive"
          loading={deleteMut.isPending}
          onConfirm={() => {
            if (!deleteTarget) return;
            deleteMut.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }}
        />
      )}

      {canDeletePutaway && (
        <ConfirmDialog
          open={!!bulkDeleteState}
          onOpenChange={(v) => !v && setBulkDeleteState(null)}
          title="Hapus Penempatan Terpilih"
          description={`Proses ${bulkDeleteState?.ids.length ?? 0} penempatan terpilih? Tiap dokumen di-revert sesuai statusnya (Belum Mulai dihapus, Sedang Diproses/Selesai direset & stok dikembalikan).`}
          confirmLabel="Proses"
          variant="destructive"
          loading={bulkDeleteMut.isPending}
          onConfirm={() => {
            if (!bulkDeleteState) return;
            bulkDeleteMut.mutate(bulkDeleteState.ids, {
              onSuccess: () => {
                bulkDeleteState.onDone();
                setBulkDeleteState(null);
              },
            });
          }}
        />
      )}
    </>
  );
}
