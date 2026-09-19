"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo } from "react";
import { useListState } from "@/hooks/use-list-state";
import Link from "next/link";
import {
  PlusIcon,
  ClipboardListIcon,
  Trash2Icon,
  UploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  ChevronDownIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Can } from "@/components/auth/can";

import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { DateRangePicker } from "@/components/ui/date-picker";
import { ImportPesananDialog } from "@/components/dashboard/transaksi-pembelian/import-pesanan-dialog";
import {
  usePurchaseOrderListExport,
  usePurchaseOrderDetailExport,
} from "@/hooks/transaksi-pembelian/use-purchase-order-import-export";
import type { ColumnDef } from "@tanstack/react-table";

import {
  usePurchaseOrders,
  useDeletePurchaseOrder,
  useBulkDeletePurchaseOrder,
} from "@/hooks/transaksi-pembelian/use-purchase-orders";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import type {
  PurchaseOrder,
  PurchaseOrderListParams,
} from "@/types/transaksi-pembelian/purchase-order";
import { formatDate, formatTime, formatCurrency } from "@/lib/format";

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

export function PesananListView() {
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "po",
  });
  const {
    search,
    setSearch,
    applySearch,
    appliedSearch,
    page,
    perPage,
    filters,
    setFilters,
    pagination,
    onPaginationChange,
  } = list;

  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<
    PurchaseOrder[] | null
  >(null);
  const [importOpen, setImportOpen] = useState(false);
  const deleteMut = useDeletePurchaseOrder();
  const bulkDeleteMut = useBulkDeletePurchaseOrder();
  const exportList = usePurchaseOrderListExport();
  const exportDetail = usePurchaseOrderDetailExport();

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function handleBulkDelete(table: {
    toggleAllPageRowsSelected: (value?: boolean) => void;
  }) {
    if (!bulkDeleteTarget) return;
    const ids = bulkDeleteTarget.map((p) => p.id);
    bulkDeleteMut.mutate(ids, {
      onSuccess: () => {
        setBulkDeleteTarget(null);
        table.toggleAllPageRowsSelected(false);
      },
    });
  }

  const params = useMemo<PurchaseOrderListParams>(() => {
    const sort = list.sorting[0];
    const p: PurchaseOrderListParams = {
      search: appliedSearch || undefined,
      page,
      per_page: perPage,
      "filter[location_id]": filters.location_id || undefined,
      sort: sort ? `${sort.desc ? "-" : ""}${sort.id}` : undefined,
    };

    if (filters.date_from) p["filter[date_from]"] = filters.date_from;
    if (filters.date_to) p["filter[date_to]"] = filters.date_to;

    return p;
  }, [appliedSearch, page, perPage, filters, list.sorting]);

  const handleExportList = async () => {
    await exportList.mutateAsync(params);
  };

  const handleExportDetail = async () => {
    await exportDetail.mutateAsync(params);
  };

  const { data, isLoading, isFetching } = usePurchaseOrders(params);
  const { data: locData } = useLocations({ perPage: 100 });

  const items = data?.items ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };
  const activeCount = [filters.location_id, filters.date_from].filter(
    Boolean,
  ).length;

  const locationOptions = useMemo(
    () => [
      { value: "", label: "Semua Lokasi" },
      ...(locData?.items ?? [])
        .filter((l) => l.isWarehouse && l.locationType !== "TRANSIT")
        .map((l) => ({ value: l.id, label: l.locationName })),
    ],
    [locData],
  );

  const hasActiveFilter = Boolean(filters.location_id || filters.date_from);

  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(
    () => [
      {
        accessorKey: "po_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Pesanan" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/transaksi-pembelian/pesanan/${row.original.id}`}
            className="font-medium text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
          >
            {row.original.po_number}
          </Link>
        ),
      },
      {
        id: "pemasok",
        header: "Pemasok",
        cell: ({ row }) => <span>{row.original.contact?.name ?? "—"}</span>,
      },
      {
        id: "lokasi",
        header: "Lokasi",
        cell: ({ row }) => (
          <span>{row.original.location?.location_name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "order_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Tgl. Pesanan / Dibuat"
          />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{formatDate(row.original.order_date)}</span>
            <span className="text-xs text-muted-foreground">
              Dibuat {formatTime(row.original.created_at)} WIB
            </span>
          </div>
        ),
      },
      {
        accessorKey: "total_amount",
        header: ({ column }) => (
          <div className="flex justify-end">
            <DataTableColumnHeader column={column} title="Nilai" />
          </div>
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums">
            {formatCurrency(row.original.total_amount)}
          </div>
        ),
      },
      {
        accessorKey: "notes",
        header: "Keterangan",
        cell: ({ row }) => (
          <div className="max-w-[160px] truncate">
            {row.original.notes || "—"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteTarget(row.original)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Hapus"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass
        radius={24}
        intensity="default"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Cari no. pesanan, pemasok..."
          align="end"
          onReset={
            hasActiveFilter || !!search
              ? list.resetAll
              : undefined
          }
          hasFilter={hasActiveFilter || !!search}
          activeCount={activeCount}
          gridCols={2}
          trailing={
            <div className="flex items-center gap-2">
              <Can permission="view-transaksi-pembelian">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={exportList.isPending || exportDetail.isPending}
                      className="gap-2"
                    >
                      {exportList.isPending || exportDetail.isPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <DownloadIcon className="size-4" />
                      )}
                      Export
                      <ChevronDownIcon className="size-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleExportList}
                      disabled={exportList.isPending}
                      className="cursor-pointer gap-2"
                    >
                      <FileSpreadsheetIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      Export Ringkasan Pesanan (List)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportDetail}
                      disabled={exportDetail.isPending}
                      className="cursor-pointer gap-2"
                    >
                      <FileSpreadsheetIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      Export Rincian Item (Detail)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Can>

              <Can permission="create-transaksi-pembelian">
                <Button
                  variant="outline"
                  onClick={() => setImportOpen(true)}
                  className="gap-2"
                >
                  <UploadIcon className="size-4" />
                  Import
                </Button>
              </Can>

              <Can permission="create-transaksi-pembelian">
                <Button variant="primary" asChild>
                  <Link href="/dashboard/transaksi-pembelian/pesanan/tambah">
                    <PlusIcon className="size-4" />
                    Buat Pesanan
                  </Link>
                </Button>
              </Can>
            </div>
          }
        >
          <Combobox
            options={locationOptions}
            value={filters.location_id}
            onChange={(v) => setFilters({ ...filters, location_id: v ?? "" })}
            placeholder="Lokasi"
            searchPlaceholder="Cari lokasi"
            className="h-9 bg-background"
          />
          <DateRangePicker
            value={{
              from: filters.date_from ? new Date(filters.date_from) : undefined,
              to: filters.date_to ? new Date(filters.date_to) : undefined,
            }}
            onChange={(range) => {
              const toStr = (d?: Date) =>
                d ? d.toISOString().slice(0, 10) : "";
              setFilters({
                ...filters,
                date_from: toStr(range?.from),
                date_to: toStr(range?.to),
              });
            }}
            placeholder="Tanggal Pesanan"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        <div className="px-5 py-5 sm:px-6">
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            isFetching={isFetching}
            enableRowSelection
            bulkActions={(selected, _table) => (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteTarget(selected)}
                className="gap-2"
              >
                <Trash2Icon className="size-4" />
                Hapus ({selected.length})
              </Button>
            )}
            hideToolbar
            manualPagination
            manualSorting
            sorting={list.sorting}
            onSortingChange={list.setSorting}
            pagination={pagination}
            rowCount={meta.total}
            onPaginationChange={onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={ClipboardListIcon}
                title="Belum ada pesanan pembelian"
                description="Buat pesanan baru untuk mulai memesan barang dari pemasok."
              />
            }
          />
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Pesanan"
        description={`Apakah Anda yakin ingin menghapus pesanan "${deleteTarget?.po_number}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!bulkDeleteTarget}
        onOpenChange={(v) => !v && setBulkDeleteTarget(null)}
        title="Hapus Pesanan (Bulk)"
        description={`Apakah Anda yakin ingin menghapus ${bulkDeleteTarget?.length} pesanan yang dipilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={bulkDeleteMut.isPending}
        onConfirm={() =>
          handleBulkDelete({ toggleAllPageRowsSelected: () => {} })
        }
      />

      <ImportPesananDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
