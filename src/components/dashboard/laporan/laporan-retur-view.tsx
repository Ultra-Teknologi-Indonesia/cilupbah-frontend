"use client";

import { useMemo, useState } from "react";
import { formatDateInput, formatDateTimeWib } from "@/lib/format";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import {
  DownloadIcon,
  FilterIcon,
  Loader2Icon,
  PackageOpenIcon,
  RefreshCwIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { DataTable } from "@/components/ui/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  useLaporanRetur,
  useLaporanReturExport,
} from "@/hooks/laporan/use-laporan-retur";
import type {
  LaporanReturParams,
  LaporanReturRow,
} from "@/types/laporan/retur";

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 20, total: 0 };

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Diterima" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "Semua Sumber" },
  { value: "manual", label: "Manual" },
  { value: "marketplace", label: "Marketplace" },
];

const REASON_CATEGORY_OPTIONS = [
  { value: "", label: "Semua Kategori" },
  { value: "FAILED_DELIVERY", label: "Gagal Kirim" },
  { value: "COMPLAINT", label: "Komplain Pembeli" },
  { value: "CANCEL_SHIPPED", label: "Cancel Telanjur Kirim" },
  { value: "REMORSE", label: "Berubah Pikiran" },
  { value: "OTHER", label: "Lainnya" },
];

const MARKETPLACE_DECISION_OPTIONS = [
  { value: "", label: "Semua Keputusan" },
  { value: "MP_PENDING", label: "Menunggu Keputusan" },
  { value: "MP_APPROVED", label: "Disetujui Marketplace" },
  { value: "MP_REJECTED", label: "Ditolak Marketplace" },
  { value: "MP_DISPUTE", label: "Dalam Banding" },
  { value: "MP_JUDGING", label: "Diarbitrase Marketplace" },
  { value: "MP_REFUNDED", label: "Dana Dikembalikan" },
  { value: "MP_CLOSED", label: "Ditutup" },
  { value: "MP_NOT_RETURN", label: "Bukan Retur" },
];

type ReturDatePreset = "custom" | "today" | "this_month" | "last_month";

const DATE_PRESET_OPTIONS: { value: ReturDatePreset; label: string }[] = [
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_month", label: "Bulan Lalu" },
  { value: "today", label: "Hari Ini" },
  { value: "custom", label: "Rentang Kustom" },
];

function presetToRange(preset: ReturDatePreset): DateRange | undefined {
  const now = new Date();
  if (preset === "today") {
    return { from: now, to: now };
  }
  if (preset === "this_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }
  if (preset === "last_month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    };
  }
  return undefined;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toIsoDate(d?: Date): string {
  return formatDateInput(d);
}

export function LaporanReturView() {
  const [datePreset, setDatePreset] = useState<ReturDatePreset>("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    presetToRange("this_month"),
  );
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [marketplaceDecision, setMarketplaceDecision] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const { data: locData } = useLocations({ perPage: 100 });

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

  const params: LaporanReturParams = useMemo(
    () => ({
      date_from: toIsoDate(dateRange?.from) || undefined,
      date_to: toIsoDate(dateRange?.to) || undefined,
      location_id: locationId || undefined,
      status: status || undefined,
      source: (source as LaporanReturParams["source"]) || undefined,
      reason_category: reasonCategory || undefined,
      marketplace_decision: marketplaceDecision || undefined,
      page,
      per_page: perPage,
    }),
    [
      dateRange,
      locationId,
      status,
      source,
      reasonCategory,
      marketplaceDecision,
      page,
      perPage,
    ],
  );

  const query = useLaporanRetur(params);
  const exportMut = useLaporanReturExport();

  const rows = query.data?.items ?? [];
  const meta = query.data?.meta ?? EMPTY_META;

  const resetPage = () => setPage(1);
  const onFilter = (fn: () => void) => {
    fn();
    resetPage();
  };

  const columns = useMemo<ColumnDef<LaporanReturRow>[]>(
    () => [
      {
        accessorKey: "return_number",
        header: "No. Retur",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.return_number}
          </span>
        ),
      },
      {
        accessorKey: "order_no",
        header: "No. Order",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span>{row.original.order_no ?? "—"}</span>
            {row.original.channel_order_no && (
              <span className="text-muted-foreground">
                MP: {row.original.channel_order_no}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "customer_name",
        header: "Pelanggan",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.customer_name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "source",
        header: "Sumber",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-2xs capitalize">
            {row.original.source}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge domain="sales-return" status={row.original.status} />
        ),
      },
      {
        accessorKey: "reason",
        header: "Alasan",
        cell: ({ row }) => (
          <span
            className="line-clamp-2 max-w-[220px] text-xs text-muted-foreground"
            title={row.original.reason ?? ""}
          >
            {row.original.reason ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "reason_category",
        header: "Kategori Alasan",
        cell: ({ row }) => (
          <StatusBadge
            domain="sales-return-reason-category"
            status={row.original.reason_category}
          />
        ),
      },
      {
        accessorKey: "marketplace_decision",
        header: "Keputusan MP",
        cell: ({ row }) =>
          row.original.source === "marketplace" ? (
            <StatusBadge
              domain="sales-return-marketplace-decision"
              status={row.original.marketplace_decision}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "shipping_fee_diff",
        header: () => <span className="block text-right">Selisih Ongkir</span>,
        cell: ({ row }) => {
          const r = row.original;
          const diff =
            r.shipping_fee_original != null && r.shipping_fee_return != null
              ? r.shipping_fee_return - r.shipping_fee_original
              : null;
          return (
            <div className="text-right tabular-nums text-foreground">
              {diff != null ? formatCurrency(diff) : "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "refund_total",
        header: () => <span className="block text-right">Refund</span>,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="text-right">
              <div className="tabular-nums font-medium">
                {formatCurrency(r.refund_total)}
              </div>
              {r.refund_count > 0 && (
                <div className="text-2xs text-muted-foreground">
                  {r.refund_count}× · {r.refund_methods.join(", ")}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "processed_at",
        header: "Diproses",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span>{formatDateTimeWib(row.original.processed_at)}</span>
            {row.original.processed_by && (
              <span className="text-muted-foreground">
                {row.original.processed_by}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Dibuat",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTimeWib(row.original.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04] p-5"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <FilterIcon className="size-4" />
          Filter Laporan
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Preset Tanggal
            </Label>
            <Combobox
              options={DATE_PRESET_OPTIONS}
              value={datePreset}
              onChange={(v) => {
                const preset = (v as ReturDatePreset) || "custom";
                onFilter(() => {
                  setDatePreset(preset);
                  setDateRange(presetToRange(preset));
                });
              }}
              placeholder="Pilih preset"
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Rentang Tanggal Dibuat
            </Label>
            <DateRangePicker
              value={dateRange}
              onChange={(r) =>
                onFilter(() => {
                  setDatePreset("custom");
                  setDateRange(r);
                })
              }
              placeholder="Semua tanggal"
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Lokasi</Label>
            <Combobox
              options={locationOptions}
              value={locationId}
              onChange={(v) => onFilter(() => setLocationId(v ?? ""))}
              placeholder="Semua Lokasi"
              searchPlaceholder="Cari lokasi..."
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Combobox
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => onFilter(() => setStatus(v ?? ""))}
              placeholder="Semua Status"
              searchPlaceholder="Cari status..."
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Sumber</Label>
            <Combobox
              options={SOURCE_OPTIONS}
              value={source}
              onChange={(v) => onFilter(() => setSource(v ?? ""))}
              placeholder="Semua Sumber"
              searchPlaceholder="Cari sumber..."
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Kategori Alasan
            </Label>
            <Combobox
              options={REASON_CATEGORY_OPTIONS}
              value={reasonCategory}
              onChange={(v) => onFilter(() => setReasonCategory(v ?? ""))}
              placeholder="Semua Kategori"
              searchPlaceholder="Cari kategori..."
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Keputusan Marketplace
            </Label>
            <Combobox
              options={MARKETPLACE_DECISION_OPTIONS}
              value={marketplaceDecision}
              onChange={(v) => onFilter(() => setMarketplaceDecision(v ?? ""))}
              placeholder="Semua Keputusan"
              searchPlaceholder="Cari keputusan..."
              className="h-9 bg-background"
            />
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3 sm:px-5">
          <div>
            <SectionTitle>Laporan Retur Detail</SectionTitle>
            <p className="text-xs text-muted-foreground">
              Total{" "}
              <Badge variant="secondary" className="tabular-nums">
                {meta.total}
              </Badge>{" "}
              retur pada filter ini
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCwIcon
                className={cn("size-3.5", query.isFetching && "animate-spin")}
              />
              <span className="ml-1.5">Muat Ulang</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => exportMut.mutate(params)}
              disabled={exportMut.isPending || rows.length === 0}
            >
              {exportMut.isPending ? (
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <DownloadIcon className="mr-1.5 size-3.5" />
              )}
              Unduh Excel
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-5">
          <DataTable
            columns={columns}
            data={rows}
            isLoading={query.isLoading}
            hideToolbar
            manualPagination
            pagination={{
              pageIndex: meta.current_page - 1,
              pageSize: meta.per_page,
            }}
            rowCount={meta.total}
            onPaginationChange={(p) => {
              setPage(p.pageIndex + 1);
              setPerPage(p.pageSize);
            }}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={PackageOpenIcon}
                title="Belum ada retur pada filter ini."
                className="py-20"
              />
            }
          />
        </div>
      </LiquidGlass>
    </div>
  );
}
