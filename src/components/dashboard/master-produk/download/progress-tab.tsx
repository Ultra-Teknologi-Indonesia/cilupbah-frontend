"use client";

import * as React from "react";
import type { PaginationState } from "@tanstack/react-table";
import { AlertTriangleIcon, RefreshCwIcon, SearchXIcon } from "lucide-react";

import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConnectedStores } from "@/hooks/channel/use-connected-stores";
import { useDownloadTransactions } from "@/hooks/master-produk/use-download";
import type {
  DownloadState,
  DownloadTransaction,
} from "@/hooks/master-produk/use-download";
import { FilterToolbar } from "../filter-toolbar";
import { TransactionDetailSheet } from "./transaction-detail-sheet";
import { buildProgressColumns } from "./progress-columns";

type StateFilter = "all" | DownloadState;

export function ProgressTab({
  tabBar,
  actionButton,
}: {
  tabBar?: React.ReactNode;
  actionButton?: React.ReactNode;
}) {
  const { data: stores = [] } = useConnectedStores();
  const storeOptions = React.useMemo(
    () =>
      stores
        .filter((s) => s.is_active)
        .map((s) => ({
          value: s.shop_id,
          label: s.shop_name,
          hint: s.channel?.name ?? undefined,
        })),
    [stores],
  );

  const [shop, setShop] = React.useState<string | null>(null);
  const [state, setState] = React.useState<StateFilter>("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const [openTrx, setOpenTrx] = React.useState<DownloadTransaction | null>(
    null,
  );

  const query = useDownloadTransactions({
    shopId: shop || undefined,
    state: state === "all" ? undefined : state,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.meta?.total ?? 0;
  const columns = React.useMemo(() => buildProgressColumns(setOpenTrx), []);

  const hasFilter = Boolean(shop || state !== "all" || dateFrom || dateTo);

  const reset = () => {
    setShop(null);
    setState("all");
    setDateFrom("");
    setDateTo("");
    resetPage();
  };

  return (
    <LiquidGlass
      radius={24}
      intensity="default"
      className="bg-white/40 dark:bg-white/[0.06]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 pt-3 sm:px-5">
        <div className="overflow-x-auto">{tabBar}</div>
        <div className="flex items-center gap-3 pb-2">
          {actionButton}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            title="Muat ulang"
          >
            <RefreshCwIcon
              className={cn(
                "size-4",
                query.isFetching && "animate-spin motion-reduce:animate-none",
              )}
            />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            Total{" "}
            <span className="font-medium text-foreground tabular-nums">
              {total}
            </span>
          </span>
        </div>
      </div>

      <FilterToolbar
        onReset={hasFilter ? reset : undefined}
        hasFilter={hasFilter}
        onRefresh={() => query.refetch()}
        isRefreshing={query.isFetching}
        activeCount={
          [shop, state !== "all", dateFrom, dateTo].filter(Boolean).length
        }
      >
        <Combobox
          options={storeOptions}
          value={shop}
          onChange={(v) => {
            setShop(v);
            resetPage();
          }}
          placeholder="Pilih toko"
          searchPlaceholder="Cari toko"
          className="h-9 bg-background"
        />
        <Select
          value={state}
          onValueChange={(v) => {
            setState(v as StateFilter);
            resetPage();
          }}
        >
          <SelectTrigger className="rounded-full bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="downloading">Sedang Berjalan</SelectItem>
            <SelectItem value="done">Selesai</SelectItem>
            <SelectItem value="failed">Gagal</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <DatePicker
            value={dateFrom ? parseISO(dateFrom) : undefined}
            onChange={(d) => {
              setDateFrom(d ? format(d, "yyyy-MM-dd") : "");
              resetPage();
            }}
            placeholder="Dari tanggal"
            className="bg-background"
          />
          <span className="text-muted-foreground">–</span>
          <DatePicker
            value={dateTo ? parseISO(dateTo) : undefined}
            onChange={(d) => {
              setDateTo(d ? format(d, "yyyy-MM-dd") : "");
              resetPage();
            }}
            placeholder="Sampai tanggal"
            className="bg-background"
          />
        </div>
      </FilterToolbar>

      <div className="px-4 py-5 sm:px-5">
        {query.isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangleIcon className="size-8 text-destructive" />
            <p className="font-medium">Gagal memuat transaksi</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              Coba lagi
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            isLoading={query.isLoading}
            getRowId={(t) => t.trxId}
            hideToolbar
            manualPagination
            rowCount={total}
            pagination={pagination}
            onPaginationChange={setPagination}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <div className="flex flex-col items-center gap-2 py-6">
                <SearchXIcon className="size-8 text-muted-foreground" />
                <p className="font-medium">Belum ada transaksi</p>
                <p className="text-sm text-muted-foreground">
                  Mulai dari Tambah Baru → Download Massal.
                </p>
              </div>
            }
          />
        )}
      </div>

      <TransactionDetailSheet
        trx={openTrx}
        open={!!openTrx}
        onOpenChange={(o) => !o && setOpenTrx(null)}
      />
    </LiquidGlass>
  );
}
