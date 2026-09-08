"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import type { DateRange } from "react-day-picker";
import {
  EyeIcon,
  LockIcon,
  PackageCheckIcon,
  DownloadIcon,
  LayersIcon,
  PlayIcon,
  PrinterIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { BuatPenempatanManualDialog } from "./buat-penempatan-manual-dialog";
import { TerimaTransferDialog } from "./terima-transfer-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import {
  useInbounds,
  useBulkCancelInbounds,
} from "@/hooks/barang-masuk/use-inbound";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import { exportCsv } from "@/lib/export-csv";
import { formatInboundExpectedDate } from "@/lib/barang-masuk/inbound-date";
import type { Inbound } from "@/types/barang-masuk/inbound";
import { usePermissions } from "@/hooks/auth/use-permissions";

type SourceTab = "semua" | "pesanan" | "transfer" | "retur";
const SOURCE_TABS: readonly SourceTab[] = [
  "pesanan",
  "transfer",
  "retur",
  "semua",
];
const TAB_TO_TYPE: Record<SourceTab, string> = {
  semua: "",
  pesanan: "PURCHASE_ORDER",
  transfer: "TRANSIT_IN",
  retur: "SALES_RETURN",
};

function activePutaway(item: Inbound) {
  return item.putaways?.find(
    (p) => !["COMPLETED", "CANCELLED"].includes(p.status),
  );
}

const TYPE_LABEL: Record<string, string> = {
  PURCHASE_ORDER: "PO",
  TRANSIT_IN: "Transfer",
  SALES_RETURN: "Retur",
  CONSIGNMENT: "Konsinyasi",
};

const TYPE_VARIANT: Record<
  string,
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "muted"
  | "info"
  | "indigo"
  | "purple"
  | "orange"
  | "teal"
> = {
  PURCHASE_ORDER: "info",
  TRANSIT_IN: "purple",
  SALES_RETURN: "orange",
  CONSIGNMENT: "teal",
};

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className="h-1.5 w-16" />
      <span className="text-xs tabular-nums text-muted-foreground">
        {value} / {total}
      </span>
    </div>
  );
}

function isSelectable(item: Inbound): boolean {
  if (item.status === "CANCELLED") return false;
  const isReturn = item.type === "SALES_RETURN";
  const totalRecv =
    item.items?.reduce(
      (s, i) =>
        s +
        (isReturn && (i.received_qty || 0) === 0
          ? i.expected_qty || 0
          : i.received_qty || 0),
      0,
    ) ?? 0;
  const totalPutaway =
    item.items?.reduce((s, i) => s + (i.putaway_qty || 0), 0) ?? 0;
  const totalReserved =
    item.items?.reduce((s, i) => s + (i.reserved_qty || 0), 0) ?? 0;

  if (isReturn) {
    return totalRecv > 0 && totalPutaway + totalReserved < totalRecv;
  }

  return (
    !["DRAFT", "CANCELLED"].includes(item.status) &&
    totalRecv > 0 &&
    totalPutaway + totalReserved < totalRecv
  );
}

function isTransitReceivable(item: Inbound): boolean {
  return (
    item.type === "TRANSIT_IN" && item.status === "DRAFT" && !!item.source_id
  );
}

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

function handleExportList(items: Inbound[]) {
  const headers = [
    "No. Penerimaan",
    "Sumber",
    "No. Referensi",
    "Tanggal Transfer Keluar",
    "Lokasi",
    "Qty Diterima",
  ];
  const rows = items.map((item) => {
    const totalRecv = item.items?.reduce((s, i) => s + i.received_qty, 0) ?? 0;
    return [
      item.transaction_number,
      TYPE_LABEL[item.type] ?? item.type,
      item.reference_number ?? "",
      formatInboundExpectedDate(item),
      item.location?.location_name ?? "",
      String(totalRecv),
    ];
  });
  exportCsv(
    `penerimaan-barang-${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows,
  );
}

export function PenerimaanBarangTab() {
  const { can } = usePermissions();
  const canCreatePutaway = can("create-penempatan");
  const canEditInbound = can("edit-barang-masuk");
  const canDeleteInbound = can("delete-barang-masuk");
  const canExportInbound = can("export-barang-masuk");
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
    debounceMs: 300,
    namespace: "penerimaan",
  });
  const [sourceTab, setSourceTab] = useUrlTab<SourceTab>("tab", "pesanan", {
    validValues: SOURCE_TABS,
    clearKeys: ["penerimaan_page"],
  });

  const handleTabChange = useCallback(
    (v: SourceTab) => {
      setSourceTab(v);
    },
    [setSourceTab],
  );

  const sortParam = useMemo(() => {
    const sort = list.sorting[0];
    if (!sort) return "-expected_date";
    const field = sort.id === "tanggal" ? "expected_date" : sort.id;
    return `${sort.desc ? "-" : ""}${field}`;
  }, [list.sorting]);

  const params = useMemo(
    () => ({
      search: list.debouncedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      "filter[location_id]": list.filters.location_id || undefined,
      "filter[type]": TAB_TO_TYPE[sourceTab] || undefined,
      "filter[date_from]": list.filters.date_from || undefined,
      "filter[date_to]": list.filters.date_to || undefined,
      sort: sortParam,
    }),
    [
      list.debouncedSearch,
      list.page,
      list.perPage,
      list.filters,
      sourceTab,
      sortParam,
    ],
  );

  const dateRange: DateRange | undefined = useMemo(() => {
    const from = parseDateStr(list.filters.date_from);
    const to = parseDateStr(list.filters.date_to);
    return from || to ? { from, to } : undefined;
  }, [list.filters.date_from, list.filters.date_to]);

  const { data, isLoading, isFetching } = useInbounds(params);
  const { data: locData } = useLocations({ perPage: 100 });

  const [penempatanTargets, setPenempatanTargets] = useState<Inbound[]>([]);
  const [terimaTarget, setTerimaTarget] = useState<Inbound | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<Inbound[]>([]);
  const bulkCancel = useBulkCancelInbounds();
  const resetSelectionRef = useRef<(() => void) | null>(null);

  const columns = useMemo<ColumnDef<Inbound>[]>(
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
        cell: ({ row }) => {
          const selectable = isSelectable(row.original);
          if (!selectable) {
            return (
              <div
                className="flex size-4 items-center justify-center text-muted-foreground"
                title="Tidak ada qty pending untuk penempatan baru"
                aria-label="Tidak ada pending"
              >
                <LockIcon className="size-4" />
              </div>
            );
          }
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Pilih baris"
              />
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        accessorKey: "transaction_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Penerimaan" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/barang-masuk/penerimaan/${row.original.id}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {row.original.transaction_number}
          </Link>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sumber" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant={TYPE_VARIANT[row.original.type] ?? "default"}>
            {TYPE_LABEL[row.original.type] ?? row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: "reference_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Referensi" />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const ref = row.original.reference_number;
          if (!ref) return <span>—</span>;
          if (
            row.original.source_type === "purchase_order" &&
            row.original.source_id
          ) {
            return (
              <Link
                href={`/dashboard/transaksi-pembelian/pesanan/${row.original.source_id}`}
                className="font-medium text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
              >
                {ref}
              </Link>
            );
          }
          return <span>{ref}</span>;
        },
      },
      {
        id: "tanggal",
        accessorFn: (row) => row.expected_date || row.created_at,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={
              sourceTab === "transfer" ? "Tanggal Transfer Keluar" : "Tanggal"
            }
          />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span>
            {formatInboundExpectedDate(row.original)}
          </span>
        ),
      },
      {
        id: "location",
        header: "Lokasi",
        cell: ({ row }) => (
          <span>{row.original.location?.location_name ?? "—"}</span>
        ),
      },

      {
        id: "progress_penempatan",
        header: "Progress Penempatan",
        cell: ({ row }) => {
          const item = row.original;
          const fallbackTotalRecv =
            item.items?.reduce(
              (s, i) =>
                s +
                (item.type === "SALES_RETURN" && (i.received_qty || 0) === 0
                  ? i.expected_qty || 0
                  : i.received_qty || 0),
              0,
            ) ?? 0;
          const fallbackTotalPutaway =
            item.items?.reduce((s, i) => s + (i.putaway_qty || 0), 0) ?? 0;
          const totalRecv =
            item.placement_summary?.received_qty ?? fallbackTotalRecv;
          const totalPutaway =
            item.placement_summary?.putaway_qty ?? fallbackTotalPutaway;
          const placementLabel = {
            NOT_STARTED: "Belum ditempatkan",
            PARTIAL: "Sebagian ditempatkan",
            COMPLETED: "Selesai ditempatkan",
            CANCELLED: "Dibatalkan",
          }[item.placement_status ?? "NOT_STARTED"];

          return (
            <div className="min-w-36 space-y-1">
              <ProgressBar value={totalPutaway} total={totalRecv} />
              <p className="text-2xs text-muted-foreground">{placementLabel}</p>
            </div>
          );
        },
      },

      {
        accessorKey: "created_by",
        header: "Dibuat oleh",
        cell: ({ row }) => (
          <span>{row.original.created_by || "—"}</span>
        ),
      },
      {
        id: "dikerjakan",
        header: "Dikerjakan",
        cell: ({ row }) => {
          const worker = row.original.putaways?.[0]?.assignee?.name;
          return <span>{worker ?? "—"}</span>;
        },
      },
      {
        accessorKey: "notes",
        header: "Keterangan",
        cell: ({ row }) => (
          <span className="inline-block max-w-50 whitespace-normal wrap-break-words">
            {row.original.notes ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          const active = activePutaway(item);
          const canDelete =
            !["DRAFT", "CANCELLED"].includes(item.status) && !active;
          const canPrintPO =
            item.source_type === "purchase_order" && !!item.source_id;

          return (
            <div
              className="flex items-center justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {canPrintPO && canExportInbound && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  asChild
                  aria-label="Pratinjau & cetak PO"
                  title="Pratinjau & cetak Barang Masuk Pembelian"
                >
                  <Link
                    href={`/dashboard/document-preview/purchase-order/${item.source_id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PrinterIcon className="size-4" />
                  </Link>
                </Button>
              )}
              {canDelete && canDeleteInbound && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetSelectionRef.current = null;
                    setDeleteTargets([item]);
                  }}
                  aria-label="Hapus penerimaan"
                  title="Hapus penerimaan"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              )}
              {isTransitReceivable(item) && canEditInbound && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTerimaTarget(item);
                  }}
                >
                  <PackageCheckIcon className="size-4" />
                  Terima
                </Button>
              )}
              {isSelectable(item) && canCreatePutaway && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetSelectionRef.current = null;
                    setPenempatanTargets([item]);
                  }}
                >
                  <LayersIcon className="size-4" />
                  Penempatan
                </Button>
              )}
              {active &&
                (() => {
                  const totalRecv =
                    item.items?.reduce(
                      (s, i) => s + (i.received_qty || 0),
                      0,
                    ) ?? 0;
                  const totalPutaway =
                    item.items?.reduce((s, i) => s + (i.putaway_qty || 0), 0) ??
                    0;
                  const isFullyPutaway =
                    totalRecv > 0 && totalPutaway >= totalRecv;
                  const Icon = isFullyPutaway ? EyeIcon : PlayIcon;
                  const label = isFullyPutaway ? "Lihat" : "Pantau";
                  return (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      asChild
                    >
                      <Link
                        href={`/dashboard/barang-masuk/putaway/${active.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon className="size-4" />
                        {label}
                      </Link>
                    </Button>
                  );
                })()}
            </div>
          );
        },
      },
    ],
    [canCreatePutaway, canDeleteInbound, canEditInbound, canExportInbound, sourceTab],
  );

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

  const hasActiveFilter = list.hasActiveFilter;
  const activeCount = list.activeFilterCount;

  return (
    <>
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3 sm:px-5">
          <Tabs
            value={sourceTab}
            onValueChange={(v) => handleTabChange(v as SourceTab)}
          >
            <TabsList variant="line" className="h-auto">
              <TabsTrigger value="pesanan">Pesanan Pembelian</TabsTrigger>
              <TabsTrigger value="transfer">Transfer Masuk</TabsTrigger>
              <TabsTrigger value="retur">Retur Penjualan</TabsTrigger>
              <TabsTrigger value="semua">Semua</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {items.length > 0 && canExportInbound && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportList(items)}
              >
                <DownloadIcon className="mr-1.5 size-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
        <FilterToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Cari no. penerimaan, referensi, nama pembuat..."
          align="end"
          onReset={hasActiveFilter || !!list.search ? list.resetAll : undefined}
          hasFilter={hasActiveFilter || !!list.search}
          activeCount={activeCount}
          gridCols={2}
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
            getRowId={(row) => row.id}
            enableRowSelection={(row) =>
              (canCreatePutaway || canDeleteInbound) && isSelectable(row.original)
            }
            bulkActions={(selected, table) => {
              const sameLocation =
                new Set(selected.map((s) => s.location_id)).size <= 1;
              return (
                <div className="flex items-center gap-2">
                  {canCreatePutaway && <Button
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      if (!sameLocation) {
                        toast.warning(
                          "Penerimaan harus dari lokasi/gudang yang sama untuk digabung.",
                        );
                        return;
                      }
                      resetSelectionRef.current = () =>
                        table.resetRowSelection();
                      setPenempatanTargets(selected);
                    }}
                    title={
                      sameLocation
                        ? undefined
                        : "Pilih penerimaan dari lokasi yang sama"
                    }
                  >
                    <LayersIcon className="size-4" />
                    Buat Penempatan ({selected.length})
                  </Button>}
                  {canDeleteInbound && <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      resetSelectionRef.current = () =>
                        table.resetRowSelection();
                      setDeleteTargets(selected);
                    }}
                  >
                    <Trash2Icon className="size-4" />
                    Hapus ({selected.length})
                  </Button>}
                </div>
              );
            }}

            pagination={list.pagination}
            rowCount={meta.total}
            onPaginationChange={list.onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={PackageCheckIcon}
                title="Belum ada penerimaan barang"
                description="Dokumen penerimaan dari PO, Transfer, atau Retur akan tampil
                    di sini."
              />
            }
          />
        </div>
      </LiquidGlass>

      {canCreatePutaway && <BuatPenempatanManualDialog
        inbounds={penempatanTargets}
        open={penempatanTargets.length > 0}
        onOpenChange={(open) => {
          if (!open) setPenempatanTargets([]);
        }}
        onSuccess={() => {
          resetSelectionRef.current?.();
          resetSelectionRef.current = null;
        }}
      />}

      {canEditInbound && <TerimaTransferDialog
        key={terimaTarget?.id ?? "none"}
        inbound={terimaTarget}
        open={!!terimaTarget}
        onOpenChange={(open) => {
          if (!open) setTerimaTarget(null);
        }}
      />}

      {canDeleteInbound && <ConfirmDialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open) setDeleteTargets([]);
        }}
        variant="destructive"
        title={`Hapus ${deleteTargets.length} penerimaan?`}
        description={(() => {
          if (deleteTargets.length === 0) return "";
          const isSingle = deleteTargets.length === 1;
          const target = deleteTargets[0];
          const allTransfer = deleteTargets.every(
            (d) => d.source_type === "transfer",
          );
          const allPO = deleteTargets.every(
            (d) => d.source_type === "purchase_order",
          );
          const hasReceived = deleteTargets.some((d) =>
            [
              "RECEIVED",
              "PARTIAL",
              "PUTAWAY_IN_PROGRESS",
              "COMPLETED",
            ].includes(d.status),
          );

          if (allTransfer && hasReceived) {
            return isSingle
              ? `Penerimaan ${target.transaction_number} sudah selesai diterima. Menghapus akan membalik penempatan yang sudah masuk rak dan mengembalikan Transfer Keluar terkait ke Sedang Dijalan. Barang bisa diterima ulang.`
              : "Sebagian penerimaan sudah selesai diterima. Menghapus akan membalik penempatan yang sudah masuk rak dan mengembalikan Transfer Keluar terkait ke Sedang Dijalan.";
          }

          if (allTransfer) {
            return isSingle
              ? `Penerimaan ${target.transaction_number} akan dihapus dan Transfer Keluar terkait dikembalikan ke Sedang Dijalan. Barang bisa diterima ulang.`
              : "Penerimaan transfer dihapus dan Transfer Keluar terkait dikembalikan ke Sedang Dijalan. Barang bisa diterima ulang.";
          }

          if (allPO && hasReceived) {
            return isSingle
              ? `Penerimaan ${target.transaction_number} sudah selesai diterima. Menghapus akan membalik penempatan yang sudah masuk rak dan mengembalikan Pesanan Pembelian ke status Belum Diterima agar bisa diterima ulang.`
              : "Sebagian penerimaan PO sudah selesai diterima. Menghapus akan membalik penempatan yang sudah masuk rak dan mengembalikan Pesanan Pembelian ke Belum Diterima.";
          }

          return "Penerimaan dibatalkan dan stok yang belum ditempatkan dikembalikan dari bin inbound. Tindakan ini tidak bisa dibatalkan.";
        })()}
        confirmLabel="Hapus"
        loading={bulkCancel.isPending}
        onConfirm={() => {
          bulkCancel.mutate(
            deleteTargets.map((d) => d.id),
            {
              onSuccess: () => {
                resetSelectionRef.current?.();
                resetSelectionRef.current = null;
                setDeleteTargets([]);
              },
            },
          );
        }}
      />}
    </>
  );
}
