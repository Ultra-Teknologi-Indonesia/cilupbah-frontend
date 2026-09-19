"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2Icon,
  PackageIcon,
  PencilIcon,
  PrinterIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { ResourceListView } from "@/components/dashboard/shared/resource-list-view";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useListState } from "@/hooks/use-list-state";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  useBinTransferList,
  usePrintBinTransfer,
  useRevertBinTransferPrint,
  useDeleteBinTransfer,
  type BinTransferListItem,
  type BinTransferStatus,
} from "@/hooks/transaksi-stok/use-bin-transfer";
import { exportCsv } from "@/lib/export-csv";
import { formatDateTimeWib, formatDateTime } from "@/lib/format";
import { openBinTransferPdf } from "@/lib/bin-transfer-pdf";
import { toast } from "sonner";

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

export function PindahBinListTable({ status }: { status: BinTransferStatus }) {
  const router = useRouter();
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    urlSync: true,
    namespace: `pbin_${status.toLowerCase()}`,
  });

  const sortParam = useMemo(() => {
    const sort = list.sorting[0];
    if (!sort) return undefined;
    return `${sort.desc ? "-" : ""}${sort.id}`;
  }, [list.sorting]);

  const params = useMemo(
    () => ({
      q: list.appliedSearch || undefined,
      status,
      page: list.page,
      perPage: list.perPage,
      locationId: list.filters.locationId || undefined,
      dateFrom: list.filters.dateFrom || undefined,
      dateTo: list.filters.dateTo || undefined,
      sort: sortParam,
    }),
    [
      list.appliedSearch,
      list.page,
      list.perPage,
      list.filters,
      status,
      sortParam,
    ],
  );

  const { data, isLoading, isFetching } = useBinTransferList(params);
  const { data: locData } = useLocations({ perPage: 100 });

  const printMut = usePrintBinTransfer();
  const revertMut = useRevertBinTransferPrint();
  const deleteMut = useDeleteBinTransfer();

  const { can } = usePermissions();
  const canEdit = can("edit-pindah-bin");
  const canDelete = can("delete-pindah-bin");

  const [printingId, setPrintingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BinTransferListItem | null>(
    null,
  );
  const [revertTarget, setRevertTarget] = useState<BinTransferListItem | null>(
    null,
  );

  const items = useMemo(
    () => (data?.data ?? []) as BinTransferListItem[],
    [data],
  );
  const total = data?.meta?.total ?? 0;

  const isTransit = status === "SEDANG_DIJALAN";

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

  const handlePrint = useCallback(
    async (item: BinTransferListItem) => {
      if (printingId) return;
      setPrintingId(item.id);
      try {
        await printMut.mutateAsync(item.id);
        toast.success("Surat jalan dicetak — pindah ke Sedang Dijalan");
        openBinTransferPdf(item.id);
      } catch {
      } finally {
        setPrintingId(null);
      }
    },
    [printingId, printMut],
  );

  const handleReprint = useCallback((item: BinTransferListItem) => {
    openBinTransferPdf(item.id);
  }, []);

  const columns = useMemo<ColumnDef<BinTransferListItem>[]>(() => {
    const base: ColumnDef<BinTransferListItem>[] = [
      {
        accessorKey: "transfer_number",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="No. Transfer Internal"
          />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/transaksi-stok/pindah-bin/${row.original.id}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {row.original.transfer_number}
          </Link>
        ),
      },
      {
        accessorKey: "transfer_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tanggal" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-foreground whitespace-nowrap text-xs">
            {formatDateTime(row.original.transfer_date)}
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
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge domain="bin-transfer" status={row.original.status} />
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
        accessorKey: "created_by",
        header: "Dibuat Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.created_by}</span>
        ),
      },
    ];

    if (isTransit) {
      base.push({
        id: "printed_by",
        header: "Dicetak Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.printed_by || "—"}
          </span>
        ),
      });
    }

    base.push({
      id: "actions",
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        const item = row.original;
        const busy = printingId === item.id;
        if (isTransit) {
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleReprint(item)}
                aria-label="Cetak ulang surat jalan"
                title="Cetak ulang"
                className="text-primary hover:text-primary"
              >
                <PrinterIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setRevertTarget(item)}
                aria-label="Kembalikan ke Baru Dibuat"
                title="Kembalikan ke Baru Dibuat"
                className="text-destructive hover:text-destructive"
              >
                <RotateCcwIcon className="size-3.5" />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handlePrint(item)}
              disabled={busy}
              aria-label="Cetak surat jalan"
              title="Cetak surat jalan"
              className="text-primary hover:text-primary"
            >
              {busy ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <PrinterIcon className="size-3.5" />
              )}
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  router.push(
                    `/dashboard/transaksi-stok/pindah-bin/${item.id}/edit`,
                  )
                }
                aria-label="Edit transfer"
                title="Edit transfer"
              >
                <PencilIcon className="size-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteTarget(item)}
                aria-label="Hapus transfer"
                title="Hapus transfer"
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            )}
          </div>
        );
      },
    });

    return base;
  }, [
    isTransit,
    printingId,
    handlePrint,
    handleReprint,
    router,
    canEdit,
    canDelete,
  ]);

  const handleExport = useCallback(() => {
    if (items.length === 0) return;
    exportCsv(
      "transfer-internal.csv",
      [
        "No. Transfer Internal",
        "Tanggal",
        "Lokasi",
        "Status",
        "Keterangan",
        "Dibuat Oleh",
        "Dicetak Oleh",
      ],
      items.map((it) => [
        it.transfer_number,
        formatDateTimeWib(it.transfer_date),
        it.location?.location_name ?? "",
        it.status,
        it.notes ?? "",
        it.created_by,
        it.printed_by ?? "",
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
        searchPlaceholder="Cari no. transfer internal..."
        onExport={handleExport}
        emptyIcon={PackageIcon}
        emptyTitle={
          isTransit
            ? "Belum ada transfer sedang dijalan"
            : "Belum ada transfer internal"
        }
        emptyDescription={
          isTransit
            ? "Cetak transfer dari tab Baru Dibuat untuk memindahkannya ke sini."
            : "Buat transfer internal baru untuk memindahkan stok antar rak dalam gudang yang sama."
        }
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
              placeholder="Rentang tanggal transfer"
              className="h-9 bg-background"
            />
          </>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Hapus Transfer Internal"
        description={`Hapus transfer ${deleteTarget?.transfer_number ?? ""}? Stok yang sudah dialokasikan akan dikembalikan ke rak asal. Aksi ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMut.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />

      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={(open) => {
          if (!open) setRevertTarget(null);
        }}
        title="Kembalikan ke Baru Dibuat"
        description={`Transfer ${revertTarget?.transfer_number ?? ""} sedang dijalan. Mengembalikan akan membatalkan cetak dan memindahkannya kembali ke Baru Dibuat.`}
        confirmLabel="Kembalikan"
        variant="destructive"
        loading={revertMut.isPending}
        onConfirm={() => {
          if (!revertTarget) return;
          revertMut.mutate(revertTarget.id, {
            onSuccess: () => {
              setRevertTarget(null);
              toast.success("Transfer dikembalikan ke Baru Dibuat");
            },
          });
        }}
      />
    </>
  );
}
