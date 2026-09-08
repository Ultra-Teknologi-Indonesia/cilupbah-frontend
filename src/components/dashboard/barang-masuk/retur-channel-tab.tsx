"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo, useCallback } from "react";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import Link from "next/link";
import {
  CornerDownLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  FlagIcon,
  PlusIcon,
  Loader2Icon,
  RefreshCwIcon,
  DownloadIcon,
  CalendarIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  useSalesReturnsUnprocessed,
  useSalesReturns,
  useSalesReturnFilterOptions,
} from "@/hooks/barang-masuk/use-sales-returns";
import {
  useAcceptSalesReturn,
  useRejectSalesReturn,
  useCompleteSalesReturn,
  useSyncReturnTracking,
  useSyncReturnDetail,
} from "@/hooks/barang-masuk/use-sales-return-actions";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import type { SalesReturn } from "@/types/barang-masuk/sales-return";

// eslint-disable-next-line no-restricted-imports
import { SalesReturnService } from "@/services/barang-masuk/sales-return.service";
import { DateRangePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { formatDateTime } from "@/lib/format";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import type { ChannelCode } from "@/types/channel";
import { usePermissions } from "@/hooks/auth/use-permissions";

type ReturSubTab = "unprocessed" | "rejected" | "accepted" | "completed";

const SUB_TABS: { key: ReturSubTab; label: string }[] = [
  { key: "unprocessed", label: "Barang Retur" },
  { key: "rejected", label: "Ditolak" },
  { key: "accepted", label: "Disetujui" },
  { key: "completed", label: "Selesai" },
];

const SUBTAB_TO_STATUS: Record<ReturSubTab, string> = {
  unprocessed: "",
  rejected: "REJECTED",
  accepted: "ACCEPTED",
  completed: "COMPLETED",
};

interface FilterState {
  location_id: string;
  channel_shop_id: string;
  reason: string;
}

const EMPTY_FILTERS: FilterState = {
  location_id: "",
  channel_shop_id: "",
  reason: "",
};

const RAW_STATUS_LABELS: Record<string, string> = {
  RETURN_OR_REFUND_REQUEST_PENDING: "Menunggu peninjauan channel",
  AWAITING_BUYER_SHIP: "Menunggu barang dikirim pembeli",
  BUYER_SHIPPED_ITEM: "Barang dikirim pembeli",
  REQUEST_SUCCESS: "Permintaan disetujui channel",
  REQUEST_REJECTED: "Permintaan ditolak channel",
  RETURN_OR_REFUND_REQUEST_COMPLETE: "Retur/refund selesai di channel",
  RETURN_OR_REFUND_CANCEL: "Retur/refund dibatalkan di channel",
  REQUESTED: "Menunggu keputusan channel",
  ACCEPTED: "Disetujui channel",
  PROCESSING: "Sedang diproses channel",
  CLOSED: "Ditutup channel",
  CANCELLED: "Dibatalkan channel",
  REFUNDED: "Dana dikembalikan channel",
  COMPLETED: "Selesai di channel",
};

const REASON_LABELS: Record<string, string> = {
  "wrong product sent": "Produk yang dikirim tidak sesuai",
  "change of mind": "Pembeli berubah pikiran",
  "product doesn't match description": "Produk tidak sesuai deskripsi",
  "product does not match description": "Produk tidak sesuai deskripsi",
  WRONG_PRODUCT: "Produk yang dikirim tidak sesuai",
  NO_NEED: "Pembeli berubah pikiran",
  NO_NEED_NON_MALL: "Pembeli berubah pikiran",
  NOT_MATCH_DESCRIPTION: "Produk tidak sesuai deskripsi",
};

function humanize(value: string): string {
  return value.replace(/[_-]+/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function getReasonLabel(item: SalesReturn): string {
  const candidates = [item.reason_display, item.channel_reason_text, item.channel_reason_code, item.reason];
  for (const value of candidates) {
    if (!value) continue;
    const label = REASON_LABELS[value] ?? REASON_LABELS[value.toLowerCase()];
    return label ?? humanize(value);
  }
  return "—";
}

function getChannelCode(item: SalesReturn): ChannelCode {
  if (item.channel) return item.channel as ChannelCode;
  const prefix = item.channel_return_id?.split(":", 1)[0];
  return (prefix || (item.source === "marketplace" ? "marketplace" : "manual")) as ChannelCode;
}

export function ReturChannelTab() {
  const { can } = usePermissions();
  const canEditReturn = can("edit-retur-penjualan");
  const canCreateReturn = can("create-retur-penjualan");
  const canExportReturn = can("export-retur-penjualan");
  const [subTab, setSubTab] = useUrlTab<ReturSubTab>("tab", "unprocessed", {
    validValues: ["unprocessed", "rejected", "accepted", "completed"],
  });
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: "retur_channel",
  });

  const [acceptTarget, setAcceptTarget] = useState<SalesReturn | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SalesReturn | null>(null);
  const [completeTarget, setCompleteTarget] = useState<SalesReturn | null>(
    null,
  );
  const [processedBy, setProcessedBy] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [approvedQty, setApprovedQty] = useState<Record<string, number>>({});

  const [exportRange, setExportRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const acceptMutation = useAcceptSalesReturn();
  const rejectMutation = useRejectSalesReturn();
  const completeMutation = useCompleteSalesReturn();
  const syncTrackingMutation = useSyncReturnTracking();
  const syncDetailMutation = useSyncReturnDetail();

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await SalesReturnService.exportChannelOnline({
        date_from: exportRange?.from
          ? format(exportRange.from, "yyyy-MM-dd")
          : undefined,
        date_to: exportRange?.to
          ? format(exportRange.to, "yyyy-MM-dd")
          : undefined,
        location_id: list.filters.location_id || undefined,
        status: exportStatus || undefined,
      });
      toast.success("File Excel berhasil diunduh");
      setExportModalOpen(false);
    } catch (error) {
      apiError(error, "Gagal mengunduh file Excel");
    } finally {
      setIsExporting(false);
    }
  }, [exportRange, list.filters.location_id, exportStatus]);

  const handleSubTabChange = useCallback(
    (t: ReturSubTab) => {
      setSubTab(t);
      list.setPage(1);
    },
    [setSubTab, list],
  );

  const isUnprocessed = subTab === "unprocessed";
  const statusFilter = SUBTAB_TO_STATUS[subTab];

  const params = useMemo(
    () => ({
      search: list.debouncedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      sort: list.sorting[0]
        ? `${list.sorting[0].desc ? "-" : ""}${list.sorting[0].id}`
        : undefined,
      "filter[status]": statusFilter || undefined,
      "filter[location_id]": list.filters.location_id || undefined,
      "filter[channel_shop_id]": list.filters.channel_shop_id || undefined,
      "filter[reason]": list.filters.reason || undefined,
    }),
    [
      list.debouncedSearch,
      list.page,
      list.perPage,
      list.sorting,
      statusFilter,
      list.filters,
    ],
  );

  const unprocessedQuery = useSalesReturnsUnprocessed(
    isUnprocessed ? params : {},
  );
  const listQuery = useSalesReturns(!isUnprocessed ? params : {});

  const activeQuery = isUnprocessed ? unprocessedQuery : listQuery;
  const { data, isLoading, isFetching } = activeQuery;
  const { data: locData } = useLocations({ perPage: 100 });
  const { data: filterOptions } = useSalesReturnFilterOptions();

  const columns = useMemo<ColumnDef<SalesReturn>[]>(() => {
    const cols: ColumnDef<SalesReturn>[] = [
      {
        accessorKey: "return_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Retur" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/barang-masuk/retur/${row.original.id}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {row.original.return_number}
          </Link>
        ),
      },
      {
        accessorKey: "source",
        header: "Sumber",
        cell: ({ row }) => {
          const item = row.original;
          const code = getChannelCode(item);
          const channelName = item.channel_name ?? (code === "manual" ? "Manual" : humanize(code));
          return (
            <div className="flex min-w-[150px] items-center gap-2">
              <ChannelLogo code={code} name={channelName} className="size-7 rounded-lg" />
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{channelName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.channel_shop_name ?? (item.source === "marketplace" ? "Toko channel" : "Input manual")}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "return_tracking_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Resi Retur" />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const isSyncing =
            syncTrackingMutation.isPending &&
            syncTrackingMutation.variables === item.id;
          return (
            <div className="flex items-center gap-1.5">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium tabular-nums text-foreground">
                  {item.return_tracking_number ?? "—"}
                </span>
                {item.return_carrier && (
                  <span className="truncate text-xs text-muted-foreground">
                    {item.return_carrier}
                  </span>
                )}
              </div>
              {canEditReturn && item.source === "marketplace" && (
                <button
                  type="button"
                  title="Sinkron resi dari marketplace"
                  disabled={isSyncing}
                  onClick={() => syncTrackingMutation.mutate(item.id)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCwIcon
                    className={cn("size-3.5", isSyncing && "animate-spin")}
                  />
                </button>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "marketplace_decision",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Keputusan MP" />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          if (item.source !== "marketplace") {
            return <span className="text-muted-foreground">—</span>;
          }
          const isSyncing =
            syncDetailMutation.isPending &&
            syncDetailMutation.variables === item.id;
          const rawStatus = item.marketplace_raw_status?.toUpperCase();
          return (
            <div className="flex items-center gap-1.5">
              <div className="min-w-[170px]">
                <StatusBadge
                  domain="sales-return-marketplace-decision"
                  status={item.marketplace_decision}
                />
                {rawStatus && (
                  <div className="mt-1 text-xs text-muted-foreground" title={rawStatus}>
                    Channel: {item.marketplace_raw_status_label ?? RAW_STATUS_LABELS[rawStatus] ?? humanize(rawStatus)}
                  </div>
                )}
              </div>
              {canEditReturn && <button
                type="button"
                title="Sinkron keputusan marketplace"
                disabled={isSyncing}
                onClick={() => syncDetailMutation.mutate(item.id)}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <RefreshCwIcon
                  className={cn("size-3.5", isSyncing && "animate-spin")}
                />
              </button>}
            </div>
          );
        },
      },
      {
        accessorKey: "refund_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Refund" />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const amount = row.original.refund_amount;
          return (
            <div className="text-right tabular-nums text-foreground">
              {amount != null
                ? new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(amount)
                : "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "customer_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pelanggan" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="max-w-[180px]" title="Nama ditampilkan persis seperti yang diterima dari channel">
            <span className="text-foreground">{row.original.customer_name ?? "—"}</span>
            {row.original.customer_name && row.original.source === "marketplace" && (
              <div className="text-[11px] text-muted-foreground">Nama dari channel</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "reason",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Alasan" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="max-w-[160px] truncate text-muted-foreground">
            {getReasonLabel(row.original)}
          </div>
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
        id: "qty",
        header: "Qty",
        cell: ({ row }) => {
          const totalQty =
            row.original.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
          return (
            <span className="tabular-nums text-muted-foreground">
              {totalQty}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tgl. Retur" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-foreground whitespace-nowrap text-xs">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <StatusBadge domain="sales-return" status={row.original.status} />
        ),
      },
    ];

    if (isUnprocessed && canEditReturn) {
      cols.push({
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setAcceptTarget(item);
                  setProcessedBy("");
                }}
                className="h-8 gap-1.5"
              >
                <CheckCircleIcon className="size-4" />
                Setujui
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setRejectTarget(item);
                  setProcessedBy("");
                  setRejectReason("");
                }}
                className="h-8 gap-1.5"
              >
                <XCircleIcon className="size-4" />
                Tolak
              </Button>
            </div>
          );
        },
      });
    } else if (subTab === "accepted" && canEditReturn) {
      cols.push({
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          const isCancelledShipped = item.reason_category === "CANCEL_SHIPPED";
          return (
            <div className="flex items-center justify-end">
              {isCancelledShipped ? (
                <Button size="sm" className="h-8 gap-1.5" asChild>
                  <Link
                    href={`/dashboard/barang-masuk/penerimaan?penerimaan_search=${encodeURIComponent(item.return_number)}`}
                  >
                    <CheckCircleIcon className="size-4" />
                    Buka Penerimaan
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setCompleteTarget(item);
                    setProcessedBy("");
                  }}
                  className="h-8 gap-1.5"
                >
                  <FlagIcon className="size-4" />
                  Selesaikan
                </Button>
              )}
            </div>
          );
        },
      });
    }

    return cols;
  }, [isUnprocessed, subTab, syncTrackingMutation, syncDetailMutation, canEditReturn]);

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

  const reasonOptions = useMemo(
    () => [
      { value: "", label: "Semua Alasan" },
      ...(filterOptions?.reasons ?? []).map((reason) => ({
        value: reason.value,
        label: reason.label,
      })),
    ],
    [filterOptions?.reasons],
  );

  const shopOptions = useMemo(
    () => [
      { value: "", label: "Semua Toko" },
      ...(filterOptions?.shops ?? []).map((shop) => ({
        value: shop.value,
        label: shop.channel_name
          ? `${shop.channel_name} · ${shop.label}`
          : shop.label,
      })),
    ],
    [filterOptions?.shops],
  );

  return (
    <div className="flex flex-col gap-3">
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 sm:px-6">
          <Tabs
            value={subTab}
            onValueChange={(val) => handleSubTabChange(val as ReturSubTab)}
            className="flex flex-col gap-4"
          >
            <TabsList variant="line" className="h-auto">
              {SUB_TABS.map(({ key, label }) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            {canExportReturn && <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setExportModalOpen(true)}
            >
              <DownloadIcon className="size-4" />
              Unduh Excel
            </Button>}
            {canCreateReturn && <Button size="sm" asChild className="gap-1.5">
              <Link href="/dashboard/barang-masuk/retur/buat">
                <PlusIcon className="size-4" />
                Buat Retur
              </Link>
            </Button>}
          </div>
        </div>

        <FilterToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Cari no. retur, no. resi, kurir, pesanan, pelanggan..."
          align="end"
          onReset={
            list.hasActiveFilter || !!list.search ? list.resetAll : undefined
          }
          hasFilter={list.hasActiveFilter || !!list.search}
          activeCount={list.activeFilterCount}
          gridCols={3}
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
          <Combobox
            options={shopOptions}
            value={list.filters.channel_shop_id}
            onChange={(v) =>
              list.setFilters({
                ...list.filters,
                channel_shop_id: v ?? "",
              })
            }
            placeholder="Toko channel"
            searchPlaceholder="Cari toko"
            className="h-9 bg-background"
          />
          <Combobox
            options={reasonOptions}
            value={list.filters.reason}
            onChange={(v) =>
              list.setFilters({ ...list.filters, reason: v ?? "" })
            }
            placeholder="Alasan retur"
            searchPlaceholder="Cari alasan"
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
            pagination={list.pagination}
            rowCount={meta.total}
            onPaginationChange={list.onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={CornerDownLeftIcon}
                title="Belum ada retur"
                description="Retur dari channel online akan tampil di sini."
              />
            }
          />
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={!!acceptTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAcceptTarget(null);
            setApprovedQty({});
          }
        }}
        title="Setujui Retur"
        description={
          acceptTarget?.reason_category === "CANCEL_SHIPPED"
            ? `Paket retur ${acceptTarget?.return_number ?? ""} sudah diterima fisik di gudang? Sistem akan membuat dokumen penerimaan. Stok baru bertambah setelah SKU dipindai dan ditempatkan ke rak.`
            : `Setujui retur ${acceptTarget?.return_number ?? ""}? Qty yang disetujui akan langsung diterima dan siap ditempatkan.`
        }
        confirmLabel="Setujui"
        loading={acceptMutation.isPending}
        onConfirm={() => {
          if (!acceptTarget || !processedBy.trim()) return;
          const items = acceptTarget.items.map((it) => ({
            item_id: it.item_id,
            approved_qty: approvedQty[it.item_id] ?? it.qty,
          }));
          acceptMutation.mutate(
            { id: acceptTarget.id, processed_by: processedBy.trim(), items },
            {
              onSuccess: () => {
                setAcceptTarget(null);
                setApprovedQty({});
              },
            },
          );
        }}
      >
        <div className="space-y-4 px-1 py-2">
          <div>
            <Label htmlFor="accept-by" className="text-sm font-medium">
              Diproses oleh <span className="text-destructive">*</span>
            </Label>
            <UserSelect
              value={processedBy}
              onChange={setProcessedBy}
              defaultToSelf
              placeholder="Nama petugas"
              className="mt-1.5"
            />
          </div>

          {acceptTarget && acceptTarget.items.length > 0 && (
            <div>
              <Label className="text-sm font-medium">
                {acceptTarget?.reason_category === "CANCEL_SHIPPED" ? "Qty paket diterima" : "Qty disetujui"}
              </Label>
              <div className="mt-1.5 space-y-2">
                {acceptTarget.items.map((it) => {
                  const current = approvedQty[it.item_id] ?? it.qty;
                  return (
                    <div
                      key={it.id}
                      className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {it.product?.product?.name ??
                            it.product?.sku ??
                            it.item_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {it.product?.sku ?? "—"} · diretur {it.qty}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={it.qty}
                        value={current}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const clamped = Number.isNaN(raw)
                            ? 0
                            : Math.max(0, Math.min(raw, it.qty));
                          setApprovedQty((prev) => ({
                            ...prev,
                            [it.item_id]: clamped,
                          }));
                        }}
                        className="w-20 text-right"
                      />
                      <span className="text-xs text-muted-foreground">
                        / {it.qty}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!completeTarget}
        onOpenChange={(open) => {
          if (!open) setCompleteTarget(null);
        }}
        title="Selesaikan Retur"
        description={`Tandai retur ${completeTarget?.return_number ?? ""} sebagai selesai? Pastikan barang sudah diterima kembali ke stok.`}
        confirmLabel="Selesaikan"
        loading={completeMutation.isPending}
        onConfirm={() => {
          if (!completeTarget || !processedBy.trim()) return;
          completeMutation.mutate(
            { id: completeTarget.id, processed_by: processedBy.trim() },
            { onSuccess: () => setCompleteTarget(null) },
          );
        }}
      >
        <div className="px-1 py-2">
          <Label htmlFor="complete-by" className="text-sm font-medium">
            Diproses oleh <span className="text-destructive">*</span>
          </Label>
          <UserSelect
            value={processedBy}
            onChange={setProcessedBy}
            defaultToSelf
            placeholder="Nama petugas"
            className="mt-1.5"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title="Tolak Retur"
        description={`Tolak retur ${rejectTarget?.return_number ?? ""}?`}
        confirmLabel="Tolak"
        variant="destructive"
        loading={rejectMutation.isPending}
        onConfirm={() => {
          if (!rejectTarget || !processedBy.trim()) return;
          rejectMutation.mutate(
            {
              id: rejectTarget.id,
              processed_by: processedBy.trim(),
              reason: rejectReason.trim() || undefined,
            },
            { onSuccess: () => setRejectTarget(null) },
          );
        }}
      >
        <div className="flex flex-col gap-3 px-1 py-2">
          <div>
            <Label htmlFor="reject-by" className="text-sm font-medium">
              Diproses oleh <span className="text-destructive">*</span>
            </Label>
            <UserSelect
              value={processedBy}
              onChange={setProcessedBy}
              defaultToSelf
              placeholder="Nama petugas"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="reject-reason" className="text-sm font-medium">
              Alasan penolakan
            </Label>
            <Input
              id="reject-reason"
              placeholder="Alasan (opsional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* Modal Export Excel */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DownloadIcon className="size-4" />
              Unduh Excel Retur
            </DialogTitle>
            <DialogDescription>
              Pilih rentang tanggal dan status yang ingin diunduh.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarIcon className="size-3.5 text-muted-foreground" />
                Rentang Tanggal
              </Label>
              <DateRangePicker
                value={exportRange}
                onChange={setExportRange}
                placeholder="Pilih rentang tanggal"
                className="h-9 w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Status</Label>
              <Combobox
                value={exportStatus}
                onChange={setExportStatus}
                options={[
                  { value: "unprocessed", label: "Barang Retur" },
                  { value: "REJECTED", label: "Ditolak" },
                  { value: "ACCEPTED", label: "Disetujui" },
                  { value: "COMPLETED", label: "Selesai" },
                ]}
                placeholder="Semua Status"
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportModalOpen(false)}
              disabled={isExporting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <DownloadIcon className="size-4" />
              )}
              Unduh Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
