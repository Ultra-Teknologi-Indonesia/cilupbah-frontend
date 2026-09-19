"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import {
  DownloadIcon,
  FilterIcon,
  Loader2Icon,
  PackageOpenIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTimeWib } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/data-table/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  useNegativeStock,
  useNegativeStockExport,
} from "@/hooks/laporan/use-negative-stock";
import { useListState } from "@/hooks/use-list-state";
import type {
  NegativeStockParams,
  NegativeStockRow,
} from "@/types/laporan/negative-stock";

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 20, total: 0 };

function toIsoDate(d?: Date): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

interface NegativeStockFilters {
  locationId: string;
  stillNegative: boolean;
}

const EMPTY_FILTERS: NegativeStockFilters = {
  locationId: "",
  stillNegative: false,
};

export function NegativeStockView() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });
  const list = useListState<NegativeStockFilters>(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "negstock",
  });

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

  const params: NegativeStockParams = useMemo(
    () => ({
      from: toIsoDate(dateRange?.from) || undefined,
      to: toIsoDate(dateRange?.to) || undefined,
      location_id: list.filters.locationId || undefined,
      search: list.appliedSearch || undefined,
      still_negative: list.filters.stillNegative || undefined,
      page: list.page,
      per_page: list.perPage,
    }),
    [
      dateRange,
      list.filters.locationId,
      list.filters.stillNegative,
      list.appliedSearch,
      list.page,
      list.perPage,
    ],
  );

  const query = useNegativeStock(params);
  const exportMut = useNegativeStockExport();

  const rows = query.data?.items ?? [];
  const meta = query.data?.meta ?? EMPTY_META;

  const handleDateRangeChange = (r: DateRange | undefined) => {
    setDateRange(r);
    list.resetPage();
  };

  const columns = useMemo<ColumnDef<NegativeStockRow>[]>(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span className="font-mono">{row.original.sku ?? "—"}</span>
            <span className="text-muted-foreground">
              {row.original.product_name ?? "—"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "location_name",
        header: "Lokasi",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.location_name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "bin_code",
        header: "Kode Rak",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.bin_code ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "first_negative_at",
        header: "Minus Pertama",
        cell: ({ row }) => (
          <span className="text-xs">
            {formatDateTimeWib(row.original.first_negative_at)}
          </span>
        ),
      },
      {
        accessorKey: "min_balance",
        header: () => <span className="block text-right">Saldo Terkecil</span>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium text-destructive">
            {row.original.min_balance}
          </div>
        ),
      },
      {
        accessorKey: "current_balance",
        header: () => <span className="block text-right">Saldo Terkini</span>,
        cell: ({ row }) => (
          <div
            className={cn(
              "text-right tabular-nums",
              row.original.still_negative
                ? "font-medium text-destructive"
                : "text-foreground",
            )}
          >
            {row.original.current_balance ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "normalized_at",
        header: "Normal Kembali",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.normalized_at
              ? formatDateTimeWib(row.original.normalized_at)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "triggered_by",
        header: "Pemicu",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.triggered_by ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "negative_movements_count",
        header: () => <span className="block text-right">Movement Minus</span>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-xs">
            {row.original.negative_movements_count}
          </div>
        ),
      },
      {
        accessorKey: "still_negative",
        header: "Status",
        cell: ({ row }) =>
          row.original.still_negative ? (
            <Badge variant="destructive" className="text-2xs">
              Masih Minus
            </Badge>
          ) : (
            <Badge variant="outline" className="text-2xs">
              Sudah Normal
            </Badge>
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
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Rentang Tanggal Movement
            </Label>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder="Semua tanggal"
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Lokasi</Label>
            <Combobox
              options={locationOptions}
              value={list.filters.locationId}
              onChange={(v) =>
                list.setFilters({ ...list.filters, locationId: v ?? "" })
              }
              placeholder="Semua Lokasi"
              searchPlaceholder="Cari lokasi..."
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Cari SKU / Produk
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={list.search}
                  onChange={(e) => list.setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      list.applySearch();
                    }
                  }}
                  placeholder="Ketik SKU atau nama..."
                  className="h-9 bg-background pl-9"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => list.applySearch()}
                className="h-9"
              >
                Cari
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <Switch
              checked={list.filters.stillNegative}
              onCheckedChange={(v) =>
                list.setFilters({ ...list.filters, stillNegative: !!v })
              }
              id="still-negative"
            />
            <Label
              htmlFor="still-negative"
              className="cursor-pointer text-xs text-muted-foreground"
            >
              Tampilkan hanya rak yang masih minus (belum normal)
            </Label>
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
            <SectionTitle>Riwayat Stok Minus</SectionTitle>
            <p className="text-xs text-muted-foreground">
              Total{" "}
              <Badge variant="secondary" className="tabular-nums">
                {meta.total}
              </Badge>{" "}
              rak/SKU pernah minus pada filter ini
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
            onPaginationChange={list.onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={PackageOpenIcon}
                title="Tidak ada rak yang minus pada filter ini."
                className="py-20"
              />
            }
          />
        </div>
      </LiquidGlass>
    </div>
  );
}
