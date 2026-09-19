"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { DollarSignIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

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
  useStockRevaluations,
  useCancelStockRevaluation,
} from "@/hooks/transaksi-stok/use-stock-revaluations";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { exportCsv } from "@/lib/export-csv";
import type {
  StockRevaluation,
  StockRevaluationListParams,
} from "@/types/transaksi-stok/stock-revaluation";
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
  { value: "APPROVED", label: "Approved" },
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

export function RevaluasiTab() {
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    urlSync: true,
    namespace: "rev",
  });
  const [cancelTarget, setCancelTarget] = useState<StockRevaluation | null>(
    null,
  );

  const sortParam = useMemo(() => {
    const sort = list.sorting[0];
    if (!sort) return undefined;
    return `${sort.desc ? "-" : ""}${sort.id}`;
  }, [list.sorting]);

  const params = useMemo<StockRevaluationListParams>(
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

  const { data, isLoading, isFetching } = useStockRevaluations(params);
  const { data: locData } = useLocations({ perPage: 100 });
  const cancelMut = useCancelStockRevaluation();

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

  const columns = useMemo<ColumnDef<StockRevaluation>[]>(
    () => [
      {
        accessorKey: "revaluation_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Ubah Nilai Stok" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">
            <Link
              href={`/dashboard/transaksi-stok/revaluasi/${row.original.id}`}
              className="hover:text-primary hover:underline"
            >
              {row.original.revaluation_no}
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            domain="stock-revaluation"
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
        accessorKey: "approved_by",
        header: "Disetujui Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.approved_by ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "approved_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tgl. Disetujui" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.approved_at
              ? formatDateTimeWib(row.original.approved_at)
              : "—"}
          </span>
        ),
      },
    ],
    [],
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
      "ubah-nilai-stok.csv",
      [
        "No. Ubah Nilai Stok",
        "Lokasi",
        "Status",
        "Dibuat Oleh",
        "Disetujui Oleh",
        "Tgl. Disetujui",
      ],
      items.map((item: StockRevaluation) => [
        item.revaluation_no,
        item.location?.location_name ?? "",
        getStatusMeta("stock-revaluation", item.status).label,
        item.created_by,
        item.approved_by ?? "—",
        item.approved_at ? formatDateTimeWib(item.approved_at) : "—",
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
        searchPlaceholder="Cari no. ubah nilai stok..."
        onExport={handleExport}
        emptyIcon={DollarSignIcon}
        emptyTitle="Belum ada perubahan nilai stok"
        emptyDescription="Data perubahan nilai stok akan muncul di sini."
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
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title="Batalkan Ubah Nilai Stok"
        description={`Apakah Anda yakin ingin membatalkan "${cancelTarget?.revaluation_no}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Batalkan"
        variant="destructive"
        loading={cancelMut.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
