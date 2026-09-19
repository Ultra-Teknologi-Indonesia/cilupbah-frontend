"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontalIcon,
  Trash2Icon,
  PlusIcon,
  PrinterIcon,
} from "lucide-react";

import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceListView } from "@/components/dashboard/shared/resource-list-view";
import { ImportPenyesuaianDialog } from "@/components/dashboard/transaksi-stok/import-penyesuaian-view";
import { useListState } from "@/hooks/use-list-state";
import {
  useStockAdjustments,
  useDeleteStockAdjustment,
  useBulkDeleteStockAdjustment,
  useExportStockAdjustments,
  useStockAdjustmentBulkPdfAsync,
} from "@/hooks/transaksi-stok/use-stock-adjustments";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import type {
  StockAdjustment,
  StockAdjustmentListParams,
} from "@/types/transaksi-stok/stock-adjustment";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";

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

function toDateStr(d?: Date): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date | undefined {
  if (!s) return undefined;
  return new Date(`${s}T00:00:00`);
}

export function PenyesuaianTab() {
  const router = useRouter();
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    urlSync: true,
    namespace: "adj",
  });
  const [deleteTarget, setDeleteTarget] = useState<StockAdjustment | null>(
    null,
  );
  const [bulkDeleteState, setBulkDeleteState] = useState<{
    ids: string[];
    onDone: () => void;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { can } = usePermissions();
  const canDelete = can("delete-penyesuaian-stok");

  const sortParam = useMemo(() => {
    if (!list.sorting || list.sorting.length === 0) return undefined;
    const s = list.sorting[0];
    return s.desc ? `-${s.id}` : s.id;
  }, [list.sorting]);

  const params = useMemo<StockAdjustmentListParams>(
    () => ({
      search: list.appliedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      "filter[location_id]": list.filters.location_id || undefined,
      "filter[date_from]": list.filters.date_from || undefined,
      "filter[date_to]": list.filters.date_to || undefined,
      sort: sortParam,
    }),
    [list.appliedSearch, list.page, list.perPage, list.filters, sortParam],
  );

  const dateRange: DateRange | undefined = useMemo(() => {
    const from = parseDateStr(list.filters.date_from);
    const to = parseDateStr(list.filters.date_to);
    if (!from && !to) return undefined;
    return { from, to };
  }, [list.filters.date_from, list.filters.date_to]);

  const { data, isLoading, isFetching } = useStockAdjustments(params);
  const { data: locData } = useLocations({ perPage: 100 });
  const deleteMut = useDeleteStockAdjustment();
  const bulkDeleteMut = useBulkDeleteStockAdjustment();

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.meta?.total ?? 0;

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

  const columns = useMemo<ColumnDef<StockAdjustment>[]>(
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
        accessorKey: "adjustment_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Koreksi Stok" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium font-mono text-xs">
            <Link
              href={`/dashboard/transaksi-stok/penyesuaian/${row.original.id}`}
              className="hover:text-primary hover:underline"
            >
              {row.original.adjustment_no}
            </Link>
          </span>
        ),
      },
      {
        accessorKey: "transaction_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tgl. Transaksi" />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const d = row.original.created_at || row.original.transaction_date;
          return (
            <span className="text-foreground whitespace-nowrap text-xs">
              {formatDateTime(d)}
            </span>
          );
        },
      },
      {
        id: "location",
        header: "Lokasi",
        cell: ({ row }) => (
          <span className="text-foreground text-xs">
            {row.original.location?.location_name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "notes",
        header: "Keterangan",
        cell: ({ row }) => (
          <span
            className="text-muted-foreground text-xs line-clamp-2 max-w-[280px]"
            title={row.original.notes ?? ""}
          >
            {row.original.notes || "—"}
          </span>
        ),
      },
      {
        accessorKey: "created_by",
        header: "Dibuat Oleh",
        cell: ({ row }) => (
          <span className="text-foreground text-xs">
            {row.original.created_by}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon-sm" asChild aria-label="Cetak">
              <Link
                href={`/dashboard/document-preview/stock-adjustment/${row.original.id}`}
              >
                <PrinterIcon className="size-3.5" />
              </Link>
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteTarget(row.original)}
                aria-label="Hapus"
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canDelete],
  );

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const exportMut = useExportStockAdjustments();
  const bulkPdfMut = useStockAdjustmentBulkPdfAsync();

  const handleExport = useCallback(() => {
    const params: StockAdjustmentListParams = {};
    if (list.filters.location_id)
      params["filter[location_id]"] = list.filters.location_id;
    if (list.filters.date_from)
      params["filter[date_from]"] = list.filters.date_from;
    if (list.filters.date_to) params["filter[date_to]"] = list.filters.date_to;
    if (list.search) params.search = list.search;

    exportMut.mutate(params, {
      onSuccess: (filename) => toast.success(`${filename} berhasil diunduh`),
      onError: (err) => apiError(err, "Gagal mengunduh Excel."),
    });
  }, [list.filters, list.search, exportMut]);

  return (
    <div className="flex flex-col gap-4">
      <ResourceListView
        list={list}
        columns={columns}
        rows={items}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Cari no. koreksi atau keterangan..."
        onExport={can("export-penyesuaian-stok") ? handleExport : undefined}
        enableRowSelection
        getRowId={(row) => row.id}
        bulkActions={(selected, table) => {
          const ids = selected.map((r) => r.id);
          return (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkPdfMut.isPending || ids.length === 0}
                onClick={() => {
                  bulkPdfMut.mutate(ids, {
                    onSuccess: ({ export_id }) =>
                      router.push(
                        `/dashboard/document-preview/stock-adjustment-bulk-export/${encodeURIComponent(export_id)}`,
                      ),
                    onError: (error) =>
                      apiError(error, "Gagal memulai export penyesuaian."),
                  });
                }}
                title="Cetak dokumen terpilih"
              >
                <PrinterIcon className="mr-1.5 size-4" />
                Cetak {ids.length}
              </Button>
              {canDelete && (
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
        }}
        toolbarTrailing={
          <div className="flex items-center gap-2">
            <Can permission="import-penyesuaian-stok">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setImportOpen(true)}
              >
                Import
              </Button>
            </Can>
            <Can permission="create-penyesuaian-stok">
              <Button size="sm" asChild className="gap-1.5">
                <Link href="/dashboard/transaksi-stok/penyesuaian/buat">
                  <PlusIcon className="size-4" />
                  Koreksi Stok Baru
                </Link>
              </Button>
            </Can>
          </div>
        }
        emptyIcon={SlidersHorizontalIcon}
        emptyTitle="Belum ada koreksi stok"
        emptyDescription="Data koreksi stok akan muncul di sini."
        filterControls={
          <>
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
              placeholder="Rentang tanggal transaksi"
              className="h-9 bg-background"
            />
          </>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Koreksi Stok"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.adjustment_no}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!bulkDeleteState}
        onOpenChange={(v) => !v && setBulkDeleteState(null)}
        title="Hapus Koreksi Stok Terpilih"
        description={`Hapus ${bulkDeleteState?.ids.length ?? 0} koreksi stok? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
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

      <ImportPenyesuaianDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
