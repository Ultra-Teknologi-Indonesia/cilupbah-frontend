"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ShieldIcon, XCircleIcon } from "lucide-react";
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
import { useListState } from "@/hooks/use-list-state";
import {
  useReservedStocks,
  useCancelReservedStock,
} from "@/hooks/transaksi-stok/use-reserved-stocks";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { exportCsv } from "@/lib/export-csv";
import type {
  ReservedStock,
  ReservedStockListParams,
} from "@/types/transaksi-stok/reserved-stock";
import { formatDateTimeWib } from "@/lib/format";

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
  { value: "ACTIVE", label: "Aktif" },
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

export function CadangTab() {
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    urlSync: true,
    namespace: "cad",
  });
  const [cancelTarget, setCancelTarget] = useState<ReservedStock | null>(null);

  const sortParam = useMemo(() => {
    const sort = list.sorting[0];
    if (!sort) return undefined;
    return `${sort.desc ? "-" : ""}${sort.id}`;
  }, [list.sorting]);

  const params = useMemo<ReservedStockListParams>(
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

  const { data, isLoading, isFetching } = useReservedStocks(params);
  const { data: locData } = useLocations({ perPage: 100 });
  const cancelMut = useCancelReservedStock();
  const { can } = usePermissions();
  const canCancel = can("edit-posisi-stok");

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

  const columns = useMemo<ColumnDef<ReservedStock>[]>(
    () => [
      {
        accessorKey: "reserved_stock_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Reservasi Stok" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">
            <Link
              href={`/dashboard/transaksi-stok/cadang/${row.original.id}`}
              className="hover:text-primary hover:underline"
            >
              {row.original.reserved_stock_no}
            </Link>
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
        accessorKey: "start_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tgl. Mulai" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-foreground">
            {formatDateTimeWib(row.original.start_date)}
          </span>
        ),
      },
      {
        accessorKey: "end_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tgl. Selesai" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-foreground">
            {formatDateTimeWib(row.original.end_date)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            domain="stock-reserve"
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
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          if (item.status === "ACTIVE" && canCancel) {
            return (
              <div
                className="flex items-center justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCancelTarget(item)}
                  aria-label="Batalkan"
                  className="text-destructive hover:text-destructive"
                >
                  <XCircleIcon className="size-3.5" />
                </Button>
              </div>
            );
          }
          return null;
        },
      },
    ],
    [canCancel],
  );

  function handleCancel() {
    if (!cancelTarget) return;
    cancelMut.mutate(cancelTarget.id, {
      onSuccess: () => setCancelTarget(null),
    });
  }

  const handleExport = useCallback(() => {
    if (items.length === 0) return;
    exportCsv(
      "reservasi-stok.csv",
      [
        "No. Reservasi Stok",
        "Lokasi",
        "Tgl. Mulai",
        "Tgl. Selesai",
        "Status",
        "Dibuat Oleh",
      ],
      items.map((item: ReservedStock) => [
        item.reserved_stock_no,
        item.location?.location_name ?? "",
        formatDateTimeWib(item.start_date),
        formatDateTimeWib(item.end_date),
        getStatusMeta("stock-reserve", item.status).label,
        item.created_by,
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
        searchPlaceholder="Cari no. reservasi stok..."
        onExport={handleExport}
        emptyIcon={ShieldIcon}
        emptyTitle="Belum ada reservasi stok"
        emptyDescription="Data reservasi stok akan muncul di sini."
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
              placeholder="Rentang tanggal mulai"
              className="h-9 bg-background"
            />
          </>
        }
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title="Batalkan Reservasi Stok"
        description={`Apakah Anda yakin ingin membatalkan "${cancelTarget?.reserved_stock_no}"? Stok yang direservasi akan dikembalikan.`}
        confirmLabel="Batalkan"
        variant="destructive"
        loading={cancelMut.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
