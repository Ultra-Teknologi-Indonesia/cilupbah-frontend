"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PackageIcon,
  ArrowUpDown,
  ChevronUpIcon,
  ChevronDownIcon,
  BoxesIcon,
  BoxIcon,
  MapPinIcon,
  RefreshCwIcon,
  Loader2Icon,
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoIcon } from "lucide-react";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import {
  useStockPosition,
  usePrefetchStockDetail,
} from "@/hooks/persediaan/use-stock-position";
import { useSyncStock } from "@/hooks/master-produk/use-sync-stock";
import type {
  StockItem,
  StockListParams,
  LocationStock,
  TotalStocks,
} from "@/types/persediaan/stock";
import { formatCurrency } from "@/lib/format";
import {
  buildStockDrillHref,
  type DrillMetric,
} from "@/lib/persediaan/stock-drilldown";

type SortField = "item_code" | "average_cost" | "on_hand" | "available";
type SortDir = "asc" | "desc";
type StockFilter = "all" | "single" | "bundle";

const STOCK_FILTER_TABS: {
  key: StockFilter;
  label: string;
  icon: typeof PackageIcon;
}[] = [
  { key: "all", label: "Semua", icon: PackageIcon },
  { key: "single", label: "Satuan", icon: BoxIcon },
  { key: "bundle", label: "Bundle", icon: BoxesIcon },
];
const STOCK_FILTER_KEYS = STOCK_FILTER_TABS.map((t) => t.key);

const PRODUCT_COL_W = 300;
const COST_COL_W = 120;

const HIDDEN_LOCATIONS_KEY = "posisi-stok:hidden-locations";

interface FilterState {
  channel: string;
}

const EMPTY_FILTERS: FilterState = { channel: "" };

const SERVER_SORT_MAP: Partial<Record<SortField, string>> = {
  item_code: "product_variants.sku",
  average_cost: "average_cost",
  on_hand: "total_on_hand",
  available: "total_available",
};

function SortHeader({
  label,
  field,
  activeField,
  dir,
  onSort,
  align = "left",
  className,
}: {
  label: React.ReactNode;
  field: SortField;
  activeField: SortField | null;
  dir: SortDir;
  onSort: (f: SortField) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const isActive = activeField === field;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer select-none transition-colors hover:text-foreground",
        align === "right" && "justify-end",
        className,
      )}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        dir === "asc" ? (
          <ChevronUpIcon className="size-3" />
        ) : (
          <ChevronDownIcon className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </span>
  );
}

function StockSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="border-b border-border/40 px-3 py-3">
        <div className="flex gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="border-b border-border/20 px-3 py-3.5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex flex-1 gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StockQtyBadge({
  value,
  variant,
}: {
  value: number;
  variant: "default" | "warning" | "success" | "info" | "negative";
}) {
  if (variant === "negative") {
    return (
      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-red-100 px-2 py-0.5 font-mono text-sm font-bold tabular-nums text-red-700 dark:bg-red-500/15 dark:text-red-400">
        {value}
      </span>
    );
  }
  const colors = {
    default: value > 0 ? "" : "text-muted-foreground/50",
    warning: value > 0 ? "text-warning" : "text-muted-foreground/50",
    success: value > 0 ? "text-success" : "text-muted-foreground/50",
    info:
      value > 0
        ? "text-blue-600 dark:text-blue-400"
        : "text-muted-foreground/50",
  };
  return (
    <span
      className={cn(
        "font-mono text-sm font-semibold tabular-nums",
        colors[variant],
      )}
    >
      {value}
    </span>
  );
}

function DrillableQty({
  value,
  variant,
  itemId,
  locationId,
  metric,
  title,
}: {
  value: number;
  variant: "default" | "warning" | "success" | "info" | "negative";
  itemId?: string;
  locationId?: string;
  metric: DrillMetric;
  title: string;
}) {
  if (!itemId || value <= 0) {
    return <StockQtyBadge value={value} variant={variant} />;
  }
  return (
    <Link
      href={buildStockDrillHref(itemId, metric, locationId)}
      title={title}
      className="rounded-full transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <StockQtyBadge value={value} variant={variant} />
    </Link>
  );
}

function MetricCells({
  stock,
  emphasize,
  itemId,
  locationId,
}: {
  stock?: LocationStock | TotalStocks;
  emphasize?: boolean;
  itemId?: string;
  locationId?: string;
}) {
  const onHand = stock?.on_hand ?? 0;
  const onOrder = stock?.on_order ?? 0;
  const available = stock?.available ?? 0;
  const cellCls = cn("px-2.5 py-3 text-right", emphasize && "bg-muted/30");
  const scopeLabel = locationId ? "di lokasi ini" : "di semua lokasi";
  return (
    <>
      <TableCell className={cellCls}>
        <DrillableQty
          value={onHand}
          variant="default"
          itemId={itemId}
          locationId={locationId}
          metric="on_hand"
          title={`Lihat kronologi stok ${scopeLabel}`}
        />
      </TableCell>
      <TableCell className={cellCls}>
        <DrillableQty
          value={onOrder}
          variant="default"
          itemId={itemId}
          locationId={locationId}
          metric="on_order"
          title={`Lihat pesanan aktif ${scopeLabel}`}
        />
      </TableCell>
      <TableCell className={cellCls}>
        <StockQtyBadge
          value={available}
          variant={available < 0 ? "negative" : "success"}
        />
      </TableCell>
    </>
  );
}

function VisibleLocationsControl({
  locations,
  hidden,
  onChange,
}: {
  locations: { location_id: string; location_name: string }[];
  hidden: string[];
  onChange: (next: string[]) => void;
}) {
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const visibleCount = locations.filter(
    (l) => !hiddenSet.has(l.location_id),
  ).length;
  const allVisible = visibleCount === locations.length;

  const toggle = (id: string) => {
    onChange(
      hiddenSet.has(id) ? hidden.filter((x) => x !== id) : [...hidden, id],
    );
  };

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-full"
          disabled={locations.length === 0}
        >
          <MapPinIcon className="size-4" />
          Lokasi
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">
            {visibleCount}
            {locations.length > 0 && `/${locations.length}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Lokasi ditampilkan
        </div>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={allVisible}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50",
          )}
        >
          <Checkbox checked={allVisible} className="pointer-events-none" />
          <span>Semua lokasi</span>
        </button>
        <div className="my-1 h-px bg-border/60" />
        <div className="flex max-h-64 flex-col overflow-y-auto">
          {locations.map((l) => {
            const visible = !hiddenSet.has(l.location_id);
            return (
              <button
                key={l.location_id}
                type="button"
                onClick={() => toggle(l.location_id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={visible} className="pointer-events-none" />
                <span className="truncate text-left">{l.location_name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseSortParam(raw: string | null): {
  field: SortField | null;
  dir: SortDir;
} {
  if (!raw) return { field: null, dir: "asc" };
  const dir: SortDir = raw.startsWith("-") ? "desc" : "asc";
  const key = raw.replace(/^-/, "") as SortField;
  const valid: SortField[] = [
    "item_code",
    "average_cost",
    "on_hand",
    "available",
  ];
  return valid.includes(key)
    ? { field: key, dir }
    : { field: null, dir: "asc" };
}

export function PosisiStokView() {
  const router = useRouter();
  const prefetchStockDetail = usePrefetchStockDetail();
  const syncStock = useSyncStock();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllAcross, setSelectAllAcross] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const [stockFilter, setStockFilterRaw] = useUrlTab<StockFilter>(
    "tab",
    "all",
    { validValues: STOCK_FILTER_KEYS },
  );
  const [sortRaw, setSortRaw] = useUrlTab<string>("sort", "");
  const { field: sortField, dir: sortDir } = useMemo(
    () => parseSortParam(sortRaw || null),
    [sortRaw],
  );

  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
  });

  const [hiddenLocations, setHiddenLocations] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HIDDEN_LOCATIONS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHiddenLocations(parsed.filter((x) => typeof x === "string"));
      }
    } catch {}
  }, []);

  const updateHiddenLocations = useCallback((next: string[]) => {
    setHiddenLocations(next);
    try {
      window.localStorage.setItem(HIDDEN_LOCATIONS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const prefetchDetail = useCallback(
    (itemId: string) => {
      router.prefetch(`/dashboard/posisi-stok/${itemId}`);
      prefetchStockDetail(itemId);
    },
    [router, prefetchStockDetail],
  );

  const handleStockFilter = useCallback(
    (f: StockFilter) => {
      setStockFilterRaw(f);
      list.resetPage();
    },
    [setStockFilterRaw, list],
  );

  const handleSort = useCallback(
    (field: SortField) => {
      const parsed = parseSortParam(sortRaw || null);
      let nextDir: SortDir;
      const nextField: SortField = field;
      if (parsed.field === field) {
        nextDir = parsed.dir === "asc" ? "desc" : "asc";
      } else {
        nextDir = "asc";
      }
      setSortRaw(nextDir === "desc" ? `-${nextField}` : nextField);
      list.resetPage();
    },
    [sortRaw, setSortRaw, list],
  );

  const sortParam = useMemo(() => {
    if (!sortField) return undefined;
    const mapped = SERVER_SORT_MAP[sortField];
    if (!mapped) return undefined;
    return sortDir === "desc" ? `-${mapped}` : mapped;
  }, [sortField, sortDir]);

  const bundleFilter = useMemo(() => {
    if (stockFilter === "bundle") return "1";
    if (stockFilter === "single") return "0";
    return undefined;
  }, [stockFilter]);

  const params = useMemo<StockListParams>(
    () => ({
      search: list.appliedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      sort: sortParam,
      "filter[is_bundle]": bundleFilter,
      "filter[channel]": list.filters.channel || undefined,
    }),
    [
      list.appliedSearch,
      list.page,
      list.perPage,
      sortParam,
      bundleFilter,
      list.filters.channel,
    ],
  );

  const { data, isLoading, isFetching, refetch } = useStockPosition(params);

  const items = useMemo(() => data?.data ?? [], [data?.data]);

  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: list.perPage,
    total: 0,
    channels: [],
    locations: [],
  };

  const hiddenSet = useMemo(() => new Set(hiddenLocations), [hiddenLocations]);
  const visibleLocations = useMemo(
    () =>
      meta.locations
        .filter((l) => !hiddenSet.has(l.location_id))
        .sort((a, b) => {
          const aKecil = a.location_name.toLowerCase().includes("kecil");
          const bKecil = b.location_name.toLowerCase().includes("kecil");
          if (aKecil && !bKecil) return -1;
          if (!aKecil && bKecil) return 1;
          return a.location_name.localeCompare(b.location_name);
        }),
    [meta.locations, hiddenSet],
  );

  const channelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of meta.channels) {
      if (c.channel_code && !seen.has(c.channel_code)) {
        seen.set(c.channel_code, c.channel_name);
      }
    }
    return [
      { value: "", label: "Semua Channel" },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [meta.channels]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set());
    setSelectAllAcross(false);
  }, [params]);

  const pageItemIds = useMemo(() => items.map((i) => i.item_id), [items]);

  const allPageSelected =
    items.length > 0 && pageItemIds.every((id) => selected.has(id));
  const somePageSelected = pageItemIds.some((id) => selected.has(id));

  const hasActiveFilter =
    Boolean(list.appliedSearch) ||
    stockFilter !== "all" ||
    Boolean(list.filters.channel);

  const canSelectAllAcross =
    allPageSelected && meta.total > items.length && !hasActiveFilter;

  if (!allPageSelected && selectAllAcross) {
    setSelectAllAcross(false);
  }

  const selectedGroupIds = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (selected.has(it.item_id)) set.add(it.item_group_id);
    }
    return Array.from(set);
  }, [items, selected]);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageItemIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of pageItemIds) next.delete(id);
      } else {
        for (const id of pageItemIds) next.add(id);
      }
      return next;
    });
    setSelectAllAcross(false);
  }, [pageItemIds]);

  const runSync = useCallback(() => {
    const payload = selectAllAcross
      ? ({ mode: "all" } as const)
      : ({ mode: "bulk", productIds: selectedGroupIds } as const);
    syncStock.mutate(payload, {
      onSuccess: () => {
        setSyncOpen(false);
        setSelected(new Set());
        setSelectAllAcross(false);
      },
    });
  }, [selectAllAcross, selectedGroupIds, syncStock]);

  const selectedCount = selected.size;

  const filterTabs = (
    <Tabs
      value={stockFilter || ""}
      onValueChange={(val) => handleStockFilter(val as StockFilter)}
    >
      <TabsList variant="line" className="h-auto">
        {STOCK_FILTER_TABS.map(({ key, label, icon: Icon }) => (
          <TabsTrigger key={key} value={key}>
            <Icon />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const showSkeleton = isLoading || (isFetching && items.length === 0);
  const isRefreshing = isFetching && !isLoading && items.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <FilterToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        onSearch={list.applySearch}
          searchPlaceholder="Cari produk atau SKU..."
          align="end"
          leading={filterTabs}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
          trailing={
            <VisibleLocationsControl
              locations={meta.locations}
              hidden={hiddenLocations}
              onChange={updateHiddenLocations}
            />
          }
          onReset={
            list.hasActiveFilter || !!list.search ? list.resetAll : undefined
          }
          hasFilter={list.hasActiveFilter || !!list.search}
          activeCount={list.activeFilterCount}
          gridCols={2}
        >
          <Combobox
            options={channelOptions}
            value={list.filters.channel}
            onChange={(v) =>
              list.setFilters({ ...list.filters, channel: v ?? "" })
            }
            placeholder="Channel"
            searchPlaceholder="Cari channel"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        <div className="px-4 py-3 sm:px-5">
          {showSkeleton ? (
            <StockSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="Belum ada data stok"
              description="Produk yang memiliki stok akan muncul di sini."
            />
          ) : (
            <div
              className={cn(
                "flex flex-col gap-3 transition-opacity duration-200",
                isRefreshing && "pointer-events-none opacity-60",
              )}
            >
              {selectedCount > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/40 bg-muted/40 px-4 py-2.5">
                  <span className="text-sm font-medium text-foreground">
                    {selectAllAcross
                      ? `Semua ${meta.total} produk dipilih`
                      : `${selectedCount} dipilih`}
                  </span>
                  {canSelectAllAcross &&
                    (selectAllAcross ? (
                      <button
                        type="button"
                        onClick={() => setSelectAllAcross(false)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Batalkan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectAllAcross(true)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Pilih semua {meta.total} produk
                      </button>
                    ))}
                  <Button
                    size="sm"
                    className="ml-auto rounded-full"
                    disabled={syncStock.isPending}
                    onClick={() => setSyncOpen(true)}
                  >
                    {syncStock.isPending ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="size-4" />
                    )}
                    Sinkronkan Stok
                    {!selectAllAcross && ` (${selectedCount})`}
                  </Button>
                </div>
              )}
              <ScrollArea
                orientation="horizontal"
                type="auto"
                className="rounded-lg border border-border/40 bg-background"
                viewportClassName="[&>div]:!block"
              >
                <Table scrollContainer={false}>
                  <TableHeader>
                    <TableRow className="border-b border-border/60">
                      <TableHead
                        rowSpan={2}
                        className="sticky left-0 z-30 bg-background px-3 align-bottom text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        style={{
                          width: PRODUCT_COL_W,
                          minWidth: PRODUCT_COL_W,
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Checkbox
                            checked={
                              allPageSelected
                                ? true
                                : somePageSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={togglePage}
                            disabled={items.length === 0}
                            aria-label="Pilih semua produk di halaman ini"
                          />
                          <SortHeader
                            label="Produk"
                            field="item_code"
                            activeField={sortField}
                            dir={sortDir}
                            onSort={handleSort}
                          />
                        </span>
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className="sticky z-30 border-r border-border/40 bg-background px-3 text-right align-bottom text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        style={{
                          left: PRODUCT_COL_W,
                          width: COST_COL_W,
                          minWidth: COST_COL_W,
                        }}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          <SortHeader
                            label="Harga Pokok"
                            field="average_cost"
                            activeField={sortField}
                            dir={sortDir}
                            onSort={handleSort}
                            align="right"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="size-3 opacity-60" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Rata-rata tertimbang dari penerimaan pembelian.
                              Saldo rak negatif tidak mengurangi harga pokok.
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </TableHead>

                      {visibleLocations.map((l) => (
                        <TableHead
                          key={l.location_id}
                          colSpan={3}
                          className="border-l border-border/40 px-2.5 py-2 text-center text-xs font-semibold text-foreground"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <MapPinIcon className="size-3 text-muted-foreground" />
                            {l.location_name}
                          </span>
                        </TableHead>
                      ))}

                      <TableHead
                        rowSpan={2}
                        className="border-l border-border/60 px-2.5 align-bottom text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Transit
                      </TableHead>

                      <TableHead
                        colSpan={3}
                        className="border-l border-border/60 bg-muted/40 px-2.5 py-2 text-center text-xs font-semibold text-foreground"
                      >
                        Total Stok
                      </TableHead>
                    </TableRow>

                    <TableRow className="border-b border-border/60">
                      {visibleLocations.map((l) => (
                        <MetricSubHeaders
                          key={l.location_id}
                          borderLeft
                          sortField={sortField}
                          sortDir={sortDir}
                        />
                      ))}
                      <MetricSubHeaders
                        total
                        borderLeft
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {items.map((item: StockItem) => {
                      const locMap = new Map(
                        item.location_stocks.map((l) => [l.location_id, l]),
                      );
                      return (
                        <TableRow
                          key={item.item_id}
                          onMouseEnter={() => {
                            if (!item.is_bundle) prefetchDetail(item.item_id);
                          }}
                          onFocus={() => {
                            if (!item.is_bundle) prefetchDetail(item.item_id);
                          }}
                          className="group border-b border-border/20 transition-colors last:border-0 hover:bg-muted/40"
                        >
                          <TableCell
                            className="sticky left-0 z-20 bg-background px-3 py-3"
                            style={{
                              width: PRODUCT_COL_W,
                              minWidth: PRODUCT_COL_W,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={selected.has(item.item_id)}
                                  disabled={item.is_bundle}
                                  onCheckedChange={() =>
                                    toggleRow(item.item_id)
                                  }
                                  aria-label={
                                    item.is_bundle
                                      ? `Bundle ${item.item_name || item.item_code} dihitung dari komponen`
                                      : `Pilih ${item.item_name || item.item_code}`
                                  }
                                />
                              </span>
                              <div className="shrink-0">
                                {item.thumbnail ? (
                                  <Image
                                    src={item.thumbnail}
                                    alt={item.item_name ?? item.item_code}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 shrink-0 rounded-xl border border-border/40 object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                                    <PackageIcon className="size-5 text-muted-foreground/60" />
                                  </div>
                                )}
                              </div>
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {item.is_bundle ? (
                                    <span className="whitespace-normal break-words text-sm font-medium text-foreground">
                                      {item.item_name || item.item_code}
                                    </span>
                                  ) : (
                                    <Link
                                      href={`/dashboard/posisi-stok/${item.item_id}`}
                                      className="whitespace-normal break-words text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
                                    >
                                      {item.item_name || item.item_code}
                                    </Link>
                                  )}
                                  {item.is_bundle && (
                                    <Badge
                                      variant="outline"
                                      title="Stok virtual yang dihitung otomatis dari komponen bundle"
                                      className="shrink-0 text-2xs leading-tight border-blue-300 text-blue-600 dark:border-blue-500/30 dark:text-blue-400"
                                    >
                                      Bundle
                                    </Badge>
                                  )}
                                </div>
                                {item.variation_values.length > 0 && (
                                  <span className="whitespace-normal break-words text-xs text-foreground">
                                    {item.variation_values
                                      .map((v) => v.value)
                                      .join(", ")}
                                  </span>
                                )}
                                <CopySku sku={item.item_code} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell
                            className="sticky z-20 whitespace-nowrap border-r border-border/40 bg-background px-3 py-3 text-right text-sm text-foreground"
                            style={{ left: PRODUCT_COL_W }}
                          >
                            {formatCurrency(Number(item.average_cost))}
                          </TableCell>

                          {visibleLocations.map((l) => (
                            <MetricCells
                              key={l.location_id}
                              stock={locMap.get(l.location_id)}
                              itemId={item.is_bundle ? undefined : item.item_id}
                              locationId={l.location_id}
                            />
                          ))}

                          <TableCell className="border-l border-border/60 px-2.5 py-3 text-right">
                            <DrillableQty
                              value={item.total_stocks.transit ?? 0}
                              variant="info"
                              itemId={item.is_bundle ? undefined : item.item_id}
                              metric="transit"
                              title="Lihat kronologi transfer antar gudang"
                            />
                          </TableCell>

                          <MetricCells
                            stock={item.total_stocks}
                            emphasize
                            itemId={item.is_bundle ? undefined : item.item_id}
                          />
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {visibleLocations.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">
                  Tidak ada kolom lokasi yang ditampilkan. Gunakan tombol{" "}
                  <span className="font-medium">Lokasi</span> untuk memunculkan
                  gudang.
                </p>
              )}

              <SimplePagination
                page={meta.current_page}
                lastPage={meta.last_page}
                onPageChange={list.setPage}
                perPage={meta.per_page}
                onPerPageChange={(s) => {
                  list.setPerPage(s);
                  list.resetPage();
                }}
                pageSizeOptions={TABLE_PAGE_SIZES}
                total={meta.total}
                label="produk"
              />
            </div>
          )}
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        title="Sinkronkan Stok ke Channel"
        description={
          selectAllAcross
            ? "Sinkronkan stok SEMUA produk ke channel? Ini memproses banyak item di latar belakang."
            : `Sinkronkan stok ${selectedGroupIds.length} produk ke channel?`
        }
        confirmLabel="Sinkronkan"
        loading={syncStock.isPending}
        onConfirm={runSync}
      />
    </div>
  );
}

function MetricSubHeaders({
  total = false,
  borderLeft = false,
  sortField,
  sortDir,
  onSort,
}: {
  total?: boolean;
  borderLeft?: boolean;
  sortField: SortField | null;
  sortDir: SortDir;
  onSort?: (f: SortField) => void;
}) {
  const base =
    "px-2.5 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground";
  const emphasize = total ? "bg-muted/40" : "";
  return (
    <>
      <TableHead
        className={cn(
          base,
          emphasize,
          borderLeft && "border-l border-border/40",
        )}
      >
        {total && onSort ? (
          <SortHeader
            label="On Hand"
            field="on_hand"
            activeField={sortField}
            dir={sortDir}
            onSort={onSort}
            align="right"
            className="text-2xs uppercase"
          />
        ) : (
          "On Hand"
        )}
      </TableHead>
      <TableHead className={cn(base, emphasize)}>On Order</TableHead>
      <TableHead className={cn(base, emphasize)}>
        {total && onSort ? (
          <SortHeader
            label="Avail"
            field="available"
            activeField={sortField}
            dir={sortDir}
            onSort={onSort}
            align="right"
            className="text-2xs uppercase"
          />
        ) : (
          "Avail"
        )}
      </TableHead>
    </>
  );
}
