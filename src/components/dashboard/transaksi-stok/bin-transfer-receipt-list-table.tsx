"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { InboxIcon, EyeIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { ResourceListView } from "@/components/dashboard/shared/resource-list-view";
import { useListState } from "@/hooks/use-list-state";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  useBinTransferReceiptList,
  useDeleteBinTransferReceipt,
  type BinTransferReceiptListItem,
} from "@/hooks/transaksi-stok/use-bin-transfer";
import { exportCsv } from "@/lib/export-csv";
import { formatDateTimeWib } from "@/lib/format";
import { usePermissions } from "@/hooks/auth/use-permissions";

interface FilterState {
  locationId: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: FilterState = {
  locationId: "",
  dateFrom: "",
  dateTo: "",
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

export function BinTransferReceiptListTable() {
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    urlSync: true,
    namespace: "pbin_selesai",
  });

  const params = useMemo(
    () => ({
      q: list.appliedSearch || undefined,
      page: list.page,
      perPage: list.perPage,
      locationId: list.filters.locationId || undefined,
      dateFrom: list.filters.dateFrom || undefined,
      dateTo: list.filters.dateTo || undefined,
    }),
    [list.appliedSearch, list.page, list.perPage, list.filters],
  );

  const { data, isLoading, isFetching } = useBinTransferReceiptList(params);
  const { data: locData } = useLocations({ perPage: 100 });
  const deleteMut = useDeleteBinTransferReceipt();
  const { can } = usePermissions();
  const canEditTransfer = can("edit-pindah-bin");
  const canExportTransfer = can("export-pindah-bin");
  const [revertTarget, setRevertTarget] =
    useState<BinTransferReceiptListItem | null>(null);

  const items = useMemo(
    () => (data?.data ?? []) as BinTransferReceiptListItem[],
    [data],
  );
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

  const dateRange: DateRange | undefined = useMemo(() => {
    const from = parseDateStr(list.filters.dateFrom);
    const to = parseDateStr(list.filters.dateTo);
    if (!from && !to) return undefined;
    return { from, to };
  }, [list.filters.dateFrom, list.filters.dateTo]);

  const columns = useMemo<ColumnDef<BinTransferReceiptListItem>[]>(
    () => [
      {
        accessorKey: "receipt_number",
        header: "No. Penerimaan Transfer",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.receipt_number}
          </span>
        ),
      },
      {
        id: "transfer_number",
        header: "No. Transfer Asal",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.bin_transfer?.transfer_number ?? "—"}
          </span>
        ),
      },
      {
        id: "transfer_date",
        header: "Tgl Transfer",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.bin_transfer?.transfer_date
              ? formatDateTimeWib(row.original.bin_transfer.transfer_date)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "received_at",
        header: "Tgl Terima",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.received_at
              ? formatDateTimeWib(row.original.received_at)
              : "—"}
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
        accessorKey: "notes",
        header: "Keterangan",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.notes || "—"}
          </span>
        ),
      },
      {
        accessorKey: "received_by",
        header: "Diterima Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.received_by || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                asChild
                aria-label="Lihat Detail"
                title="Lihat Detail"
              >
                <Link
                  href={`/dashboard/transaksi-stok/penerimaan-transfer/${item.id}`}
                >
                  <EyeIcon className="size-3.5" />
                </Link>
              </Button>
              {canEditTransfer && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRevertTarget(item)}
                  aria-label="Batalkan Penerimaan"
                  title="Batalkan Penerimaan"
                  className="text-destructive hover:text-destructive"
                >
                  <RotateCcwIcon className="size-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [canEditTransfer],
  );

  const handleExport = useCallback(() => {
    if (items.length === 0) return;
    exportCsv(
      "penerimaan-transfer-internal.csv",
      [
        "No. Penerimaan Transfer",
        "No. Transfer Asal",
        "Tgl Transfer",
        "Tgl Terima",
        "Lokasi",
        "Keterangan",
        "Diterima Oleh",
      ],
      items.map((it) => [
        it.receipt_number,
        it.bin_transfer?.transfer_number ?? "",
        it.bin_transfer?.transfer_date
          ? formatDateTimeWib(it.bin_transfer.transfer_date)
          : "",
        it.received_at ? formatDateTimeWib(it.received_at) : "",
        it.location?.location_name ?? "",
        it.notes ?? "",
        it.received_by ?? "",
      ]),
    );
  }, [items]);

  return (
    <>
      <ResourceListView
        list={list}
        columns={columns}
        rows={items}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Cari no. penerimaan / transfer..."
        onExport={canExportTransfer ? handleExport : undefined}
        emptyIcon={InboxIcon}
        emptyTitle="Belum ada penerimaan transfer"
        emptyDescription="Penerimaan transfer barang yang sudah diselesaikan akan tampil di sini."
        filterControls={
          <>
            <Combobox
              options={locationOptions}
              value={list.filters.locationId}
              onChange={(v) =>
                list.setFilters({ ...list.filters, locationId: v ?? "" })
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
                  dateFrom: toDateStr(range?.from),
                  dateTo: toDateStr(range?.to),
                })
              }
              placeholder="Rentang tanggal terima"
              className="h-9 bg-background"
            />
          </>
        }
      />
      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={(op) => !op && setRevertTarget(null)}
        title="Batalkan Penerimaan?"
        description={`Anda yakin ingin membatalkan dokumen penerimaan ${revertTarget?.receipt_number}? Barang akan dikembalikan ke status SEDANG DIJALAN, asalkan stok saat ini mencukupi.`}
        confirmLabel="Ya, Batalkan"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (!revertTarget) return;
          deleteMut.mutate(revertTarget.id, {
            onSuccess: () => setRevertTarget(null),
          });
        }}
      />
    </>
  );
}
