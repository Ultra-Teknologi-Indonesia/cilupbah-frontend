"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import {
  BanknoteIcon,
  DownloadIcon,
  FilterIcon,
  HourglassIcon,
  Loader2Icon,
  ReceiptTextIcon,
  RefreshCwIcon,
  SearchIcon,
  WalletIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency, formatDateInput, formatDateTimeWib, formatNumber, parseDateInput } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { DataTable } from "@/components/ui/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import { StatCard } from "@/components/dashboard/beranda/stat-card";
import { ChannelIcon } from "@/components/dashboard/pesanan/order-card";
import { useConnectedStores } from "@/hooks/channel/use-connected-stores";
import { useListState } from "@/hooks/use-list-state";
import {
  useLaporanSettlement,
  useLaporanSettlementExport,
  useLaporanSettlementSummary,
} from "@/hooks/laporan/use-laporan-settlement";
import type {
  SettlementParams,
  SettlementRow,
} from "@/types/laporan/settlement";

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 20, total: 0 };

const EMPTY_FILTERS = {
  source: "",
  channel_shop_id: "",
  is_settled: "",
  date_from: "",
  date_to: "",
};

const SOURCE_OPTIONS = [
  { value: "", label: "Semua Channel" },
  { value: "shopee", label: "Shopee" },
  { value: "tiktok", label: "TikTok" },
  { value: "lazada", label: "Lazada" },
  { value: "tokopedia", label: "Tokopedia" },
];

const SETTLED_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "true", label: "Sudah Cair" },
  { value: "false", label: "Belum Cair" },
];

function toIsoDate(d?: Date): string {
  return formatDateInput(d);
}

function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from, to };
}

function sumOrNull(...values: (number | null | undefined)[]): number | null {
  const present = values.filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v),
  );
  if (present.length === 0) return null;
  return present.reduce((acc, v) => acc + v, 0);
}

function MoneyCell({
  value,
  tone = "default",
}: {
  value: number | null;
  tone?: "default" | "settlement";
}) {
  const negative = (value ?? 0) < 0;
  return (
    <div
      className={cn(
        "text-right tabular-nums",
        tone === "settlement" && value != null
          ? negative
            ? "font-medium text-destructive"
            : "font-medium text-success"
          : negative
            ? "text-destructive"
            : "text-foreground",
      )}
    >
      {formatCurrency(value)}
    </div>
  );
}

export function SettlementView() {
  const router = useRouter();
  const list = useListState(EMPTY_FILTERS, { perPage: 20, namespace: "stl" });
  const { filters, appliedSearch } = list;

  const fallbackRange = useMemo(() => defaultRange(), []);
  const effectiveFrom = filters.date_from || toIsoDate(fallbackRange.from);
  const effectiveTo = filters.date_to || toIsoDate(fallbackRange.to);

  const dateRange = useMemo<DateRange | undefined>(() => {
    const from = filters.date_from
      ? parseDateInput(filters.date_from)
      : fallbackRange.from;
    const to = filters.date_to ? parseDateInput(filters.date_to) : fallbackRange.to;
    return { from, to };
  }, [filters.date_from, filters.date_to, fallbackRange]);

  const { data: storesData } = useConnectedStores();
  const shopOptions = useMemo(
    () => [
      { value: "", label: "Semua Toko" },
      ...(storesData ?? []).map((s) => ({
        value: s.shop_id,
        label: s.shop_name,
      })),
    ],
    [storesData],
  );
  const shopNameById = useMemo(() => {
    const map = new Map<string, string>();
    (storesData ?? []).forEach((s) => map.set(s.shop_id, s.shop_name));
    return map;
  }, [storesData]);

  const params: SettlementParams = useMemo(
    () => ({
      search: appliedSearch || undefined,
      channel: filters.source || undefined,
      channel_shop_id: filters.channel_shop_id || undefined,
      is_settled:
        (filters.is_settled as SettlementParams["is_settled"]) || undefined,
      date_from: effectiveFrom || undefined,
      date_to: effectiveTo || undefined,
      page: list.page,
      per_page: list.perPage,
    }),
    [
      appliedSearch,
      filters.source,
      filters.channel_shop_id,
      filters.is_settled,
      effectiveFrom,
      effectiveTo,
      list.page,
      list.perPage,
    ],
  );

  const query = useLaporanSettlement(params);
  const summaryQuery = useLaporanSettlementSummary(params);
  const exportMut = useLaporanSettlementExport();

  const rows = query.data?.items ?? [];
  const meta = query.data?.meta ?? EMPTY_META;
  const summary = summaryQuery.data ?? query.data?.summary ?? null;
  const summaryLoading = summaryQuery.isLoading && !summary;

  const setFilter = (patch: Partial<typeof EMPTY_FILTERS>) => {
    list.setFilters({ ...filters, ...patch });
  };

  const columns = useMemo<ColumnDef<SettlementRow>[]>(
    () => [
      {
        accessorKey: "salesorder_no",
        header: "No Pesanan",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-primary">
            {row.original.salesorder_no}
          </span>
        ),
      },
      {
        accessorKey: "source",
        header: "Channel",
        cell: ({ row }) =>
          row.original.source ? (
            <ChannelIcon source={row.original.source} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "shop",
        header: "Nama Toko",
        cell: ({ row }) => {
          const shop =
            row.original.shop_name ??
            (row.original.channel_shop_id
              ? shopNameById.get(row.original.channel_shop_id)
              : null);
          return <span className="text-sm">{shop ?? "—"}</span>;
        },
      },
      {
        accessorKey: "transaction_date",
        header: "Tgl Pesanan",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTimeWib(row.original.transaction_date)}
          </span>
        ),
      },
      {
        id: "gross",
        header: () => <span className="block text-right">Gross</span>,
        cell: ({ row }) => (
          <MoneyCell value={row.original.finance?.gross_amount ?? null} />
        ),
      },
      {
        id: "commission_fee",
        header: () => <span className="block text-right">Biaya Admin</span>,
        cell: ({ row }) => (
          <MoneyCell value={row.original.finance?.commission_fee ?? null} />
        ),
      },
      {
        id: "service_fee",
        header: () => <span className="block text-right">Biaya Layanan</span>,
        cell: ({ row }) => (
          <MoneyCell value={row.original.finance?.service_fee ?? null} />
        ),
      },
      {
        id: "shipping",
        header: () => <span className="block text-right">Ongkir</span>,
        cell: ({ row }) => (
          <MoneyCell
            value={row.original.finance?.seller_shipping_borne ?? null}
          />
        ),
      },
      {
        id: "voucher",
        header: () => <span className="block text-right">Voucher</span>,
        cell: ({ row }) => {
          const f = row.original.finance;
          return (
            <MoneyCell
              value={sumOrNull(
                f?.seller_voucher,
                f?.platform_voucher,
                f?.payment_voucher,
              )}
            />
          );
        },
      },
      {
        id: "other_fees",
        header: () => <span className="block text-right">Biaya Lain</span>,
        cell: ({ row }) => {
          const f = row.original.finance;
          return (
            <MoneyCell
              value={sumOrNull(
                f?.transaction_fee,
                f?.affiliate_commission,
                f?.order_processing_fee,
                f?.total_tax,
                f?.insurance_cost,
              )}
            />
          );
        },
      },
      {
        id: "settlement",
        header: () => <span className="block text-right">Net Settlement</span>,
        cell: ({ row }) => (
          <MoneyCell
            value={row.original.finance?.settlement_amount ?? null}
            tone="settlement"
          />
        ),
      },
      {
        accessorKey: "settled_at",
        header: "Tgl Cair",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTimeWib(row.original.finance?.settled_at)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.finance?.is_settled ? (
            <Badge variant="success">Sudah Cair</Badge>
          ) : (
            <Badge variant="muted">Belum Cair</Badge>
          ),
      },
    ],
    [shopNameById],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Gross"
          value={formatCurrency(summary?.total_gross ?? null)}
          icon={WalletIcon}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Total Biaya"
          value={formatCurrency(summary?.total_fee ?? null)}
          icon={ReceiptTextIcon}
          tone="warning"
          isLoading={summaryLoading}
        />
        <StatCard
          label="Total Net Settlement"
          value={formatCurrency(summary?.total_settlement ?? null)}
          icon={BanknoteIcon}
          tone="success"
          isLoading={summaryLoading}
        />
        <StatCard
          label="Belum Cair"
          value={formatNumber(summary?.unsettled_count ?? null)}
          hint="Pesanan belum settle"
          icon={HourglassIcon}
          tone="warning"
          isLoading={summaryLoading}
        />
      </div>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04] p-5"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <FilterIcon className="size-4" />
          Filter Settlement
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">No Pesanan</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
                placeholder="Cari No Pesanan..."
                className="h-9 bg-background pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Rentang Tanggal Pesanan
            </Label>
            <DateRangePicker
              value={dateRange}
              onChange={(r) =>
                setFilter({
                  date_from: toIsoDate(r?.from),
                  date_to: toIsoDate(r?.to),
                })
              }
              placeholder="30 hari terakhir"
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Channel</Label>
            <Combobox
              options={SOURCE_OPTIONS}
              value={filters.source}
              onChange={(v) => setFilter({ source: v ?? "" })}
              placeholder="Semua Channel"
              searchPlaceholder="Cari channel..."
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Nama Toko</Label>
            <Combobox
              options={shopOptions}
              value={filters.channel_shop_id}
              onChange={(v) => setFilter({ channel_shop_id: v ?? "" })}
              placeholder="Semua Toko"
              searchPlaceholder="Cari toko..."
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Status Cair</Label>
            <Combobox
              options={SETTLED_OPTIONS}
              value={filters.is_settled}
              onChange={(v) => setFilter({ is_settled: v ?? "" })}
              placeholder="Semua"
              searchPlaceholder="Cari status..."
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
            <SectionTitle>Laporan Settlement</SectionTitle>
            <p className="text-xs text-muted-foreground">
              Total{" "}
              <Badge variant="secondary" className="tabular-nums">
                {meta.total}
              </Badge>{" "}
              pesanan pada filter ini
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
            onRowClick={(row) => router.push(`/dashboard/pesanan/${row.id}`)}
            pagination={{
              pageIndex: meta.current_page - 1,
              pageSize: meta.per_page,
            }}
            rowCount={meta.total}
            onPaginationChange={list.onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={BanknoteIcon}
                title="Belum ada data settlement pada filter ini."
                className="py-20"
              />
            }
          />
        </div>
      </LiquidGlass>
    </div>
  );
}
