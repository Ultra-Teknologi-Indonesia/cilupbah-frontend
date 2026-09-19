"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ClipboardCheckIcon, PlayIcon, Trash2Icon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceListView } from "@/components/dashboard/shared/resource-list-view";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { getStatusMeta } from "@/lib/status";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useListState } from "@/hooks/use-list-state";
import {
  useStockOpnames,
  useStartStockOpname,
  useDeleteStockOpname,
} from "@/hooks/transaksi-stok/use-stock-opname";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { exportCsv } from "@/lib/export-csv";
import type {
  StockOpname,
  StockOpnameListParams,
} from "@/types/transaksi-stok/stock-opname";
import { formatDateTime } from "@/lib/format";

interface FilterState {
  status: string;
  location_id: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = {
  status: "",
  location_id: "",
  date_from: "",
  date_to: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_PROGRESS", label: "Proses" },
  { value: "FINALIZED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

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

export function OpnameTab() {
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    urlSync: true,
    namespace: "opn",
  });
  const [deleteTarget, setDeleteTarget] = useState<StockOpname | null>(null);
  const [startTarget, setStartTarget] = useState<StockOpname | null>(null);
  const [processBy, setProcessBy] = useState("");
  const { can } = usePermissions();
  const canManage = can("edit-stok-opname");

  const sortParam = useMemo(() => {
    const sort = list.sorting[0];
    if (!sort) return undefined;
    return `${sort.desc ? "-" : ""}${sort.id}`;
  }, [list.sorting]);

  const params = useMemo<StockOpnameListParams>(
    () => ({
      search: list.appliedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      "filter[status]": list.filters.status || undefined,
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
    return from || to ? { from, to } : undefined;
  }, [list.filters.date_from, list.filters.date_to]);

  const { data, isLoading, isFetching } = useStockOpnames(params);
  const { data: locData } = useLocations({ perPage: 100 });
  const startMut = useStartStockOpname();
  const deleteMut = useDeleteStockOpname();

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

  const columns = useMemo<ColumnDef<StockOpname>[]>(
    () => [
      {
        accessorKey: "opname_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Stok Opname" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">
            <Link
              href={`/dashboard/transaksi-stok/opname/${row.original.id}`}
              className="hover:text-primary hover:underline"
            >
              {row.original.opname_no}
            </Link>
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tgl. Dibuat" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-foreground whitespace-nowrap text-xs">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            domain="stock-opname"
            status={row.original.status}
            className="text-2xs leading-tight"
          />
        ),
      },
      {
        accessorKey: "created_by",
        header: "Dibuat Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.created_by}</span>
        ),
      },
      {
        accessorKey: "finalized_by",
        header: "Difinalisasi",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.finalized_by ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          if (item.status === "DRAFT") {
            return (
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setStartTarget(item)}
                    aria-label="Mulai"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <PlayIcon className="size-3.5" />
                  </Button>
                )}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Hapus"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          }
          return null;
        },
      },
    ],
    [canManage],
  );

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function handleStart() {
    if (!startTarget || !processBy.trim()) return;
    startMut.mutate(
      { id: startTarget.id, processBy: processBy.trim() },
      {
        onSuccess: () => {
          setStartTarget(null);
          setProcessBy("");
        },
      },
    );
  }

  const handleExport = useCallback(() => {
    if (items.length === 0) return;
    exportCsv(
      "stok-opname.csv",
      ["No. Stok Opname", "Lokasi", "Status", "Dibuat Oleh", "Difinalisasi"],
      items.map((item: StockOpname) => [
        item.opname_no,
        item.location?.location_name ?? "",
        getStatusMeta("stock-opname", item.status).label,
        item.created_by,
        item.finalized_by ?? "—",
      ]),
    );
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <ResourceListView
        list={list}
        columns={columns}
        rows={items}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Cari no. stok opname..."
        onExport={handleExport}
        emptyIcon={ClipboardCheckIcon}
        emptyTitle="Belum ada stok opname"
        emptyDescription="Data stok opname (hitung fisik) akan muncul di sini."
        filterControls={
          <>
            <Combobox
              options={STATUS_OPTIONS}
              value={list.filters.status}
              onChange={(v) =>
                list.setFilters({ ...list.filters, status: v ?? "" })
              }
              placeholder="Status"
              searchPlaceholder="Cari status"
              className="h-9 bg-background"
            />
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
          </>
        }
      />

      <ConfirmDialog
        open={!!startTarget}
        onOpenChange={(v) => {
          if (!v) {
            setStartTarget(null);
            setProcessBy("");
          }
        }}
        title="Mulai Proses Stok Opname"
        description={`Mulai proses stok opname "${startTarget?.opname_no}"?`}
        confirmLabel="Mulai"
        variant="default"
        loading={startMut.isPending}
        onConfirm={handleStart}
      >
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-sm font-medium">Diproses oleh</label>
          <UserSelect
            value={processBy}
            onChange={setProcessBy}
            defaultToSelf
            placeholder="Nama petugas"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Stok Opname"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.opname_no}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
