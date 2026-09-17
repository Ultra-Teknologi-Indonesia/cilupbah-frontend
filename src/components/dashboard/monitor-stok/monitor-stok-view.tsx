"use client";

import { useCallback, useMemo } from "react";

import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import { MonitorStockTable } from "@/components/dashboard/monitor-stok/monitor-stock-table";
import {
  MonitorAnalyticsTable,
  type AnalyticsKind,
} from "@/components/dashboard/monitor-stok/monitor-analytics-table";
import { MonitorSyncFailedTable } from "@/components/dashboard/monitor-stok/monitor-sync-failed-table";
import { MonitorKronologiTable } from "@/components/dashboard/monitor-stok/monitor-kronologi-table";
import { MonitorStockExportMenu } from "@/components/dashboard/monitor-stok/monitor-stock-export-menu";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Loader2Icon } from "lucide-react";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { useEnabledCategories } from "@/hooks/kategori-merek/use-kategori";
import { useQueueFromMonitor } from "@/hooks/gudang/use-stock-replenishment";
import {
  useMonitorList,
  useMonitorAnalytics,
  useMonitorSummary,
  useFailedSync,
  useKronologi,
  useMovementFilters,
  isStockTab,
  isAnalyticsTab,
  isSyncTab,
  isKronologiTab,
} from "@/hooks/monitor-stok/use-monitor-stok";
import type {
  MonitorTab,
  OutOfStockMode,
  KronologiView,
} from "@/types/monitor-stok/monitor";
import type { KategoriItem } from "@/types/kategori-merek/kategori";

const TABS: { key: MonitorTab; label: string }[] = [
  { key: "stok-kosong", label: "Stok Kosong" },
  { key: "menipis", label: "Menipis" },
  { key: "tidak-laku", label: "Tidak Laku" },
  { key: "paling-laku", label: "Paling Laku" },
  { key: "perkiraan-habis", label: "Perkiraan Habis" },
  { key: "sedang-dibeli", label: "Sedang Dibeli" },
  { key: "gagal-sync", label: "Gagal Sync" },
  { key: "kronologi", label: "Kronologi Stok" },
];

const KRONOLOGI_VIEWS: { key: KronologiView; label: string }[] = [
  { key: "clean", label: "Bersih" },
  { key: "attention", label: "Perlu Perhatian" },
  { key: "all", label: "Semua" },
];

const SUB_TABS: { key: OutOfStockMode; label: string }[] = [
  { key: "habis", label: "Habis" },
  { key: "minus", label: "Minus" },
  { key: "dipesan", label: "Dipesan namun habis" },
];

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 20, total: 0 };

const PERIOD_DEFAULT: Record<string, number> = {
  "tidak-laku": 90,
  "paling-laku": 30,
  "perkiraan-habis": 30,
};

const PERIOD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  "tidak-laku": [
    { value: "30", label: "Idle > 30 hari" },
    { value: "60", label: "Idle > 60 hari" },
    { value: "90", label: "Idle > 90 hari" },
    { value: "180", label: "Idle > 180 hari" },
  ],
  "paling-laku": [
    { value: "7", label: "7 hari terakhir" },
    { value: "30", label: "30 hari terakhir" },
    { value: "90", label: "90 hari terakhir" },
  ],
  "perkiraan-habis": [
    { value: "7", label: "Habis ≤ 7 hari" },
    { value: "14", label: "Habis ≤ 14 hari" },
    { value: "30", label: "Habis ≤ 30 hari" },
  ],
};

function flattenCategories(
  items: KategoriItem[],
  prefix = "",
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  for (const item of items) {
    const label = prefix ? `${prefix} / ${item.name}` : item.name;
    result.push({ value: String(item.id), label });
    if (item.children?.length)
      result.push(...flattenCategories(item.children, label));
  }
  return result;
}

interface MonitorFilters {
  location_id: string;
  category_id: string;
  period: number;
  kron_source: string;
  kron_direction: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: MonitorFilters = {
  location_id: "",
  category_id: "",
  period: 90,
  kron_source: "",
  kron_direction: "",
  date_from: "",
  date_to: "",
};

const TAB_VALUES: readonly MonitorTab[] = [
  "stok-kosong",
  "menipis",
  "tidak-laku",
  "paling-laku",
  "perkiraan-habis",
  "sedang-dibeli",
  "gagal-sync",
  "kronologi",
];
const SUB_VALUES: readonly OutOfStockMode[] = ["habis", "minus", "dipesan"];
const KRON_VIEW_VALUES: readonly KronologiView[] = [
  "clean",
  "attention",
  "all",
];

export function MonitorStokView() {
  const list = useListState<MonitorFilters>(EMPTY_FILTERS, {
    perPage: 20,
    debounceMs: 300,
    namespace: "monitor",
  });
  const {
    search,
    setSearch,
    debouncedSearch,
    page,
    perPage,
    filters,
    setFilters,
    resetPage,
  } = list;
  const locationId = filters.location_id;
  const categoryId = filters.category_id;
  const period = filters.period;
  const kronologiSource = filters.kron_source;
  const kronologiDirection = filters.kron_direction;
  const kronologiDateFrom = filters.date_from;
  const kronologiDateTo = filters.date_to;

  const [tab, setTab] = useUrlTab<MonitorTab>("monitor_tab", "stok-kosong", {
    validValues: TAB_VALUES,
  });
  const [subMode, setSubMode] = useUrlTab<OutOfStockMode>(
    "monitor_sub",
    "habis",
    { validValues: SUB_VALUES },
  );
  const [kronologiView, setKronologiView] = useUrlTab<KronologiView>(
    "monitor_kview",
    "clean",
    { validValues: KRON_VIEW_VALUES },
  );

  const setLocationId = useCallback(
    (v: string) => setFilters({ ...filters, location_id: v }),
    [filters, setFilters],
  );
  const setCategoryId = useCallback(
    (v: string) => setFilters({ ...filters, category_id: v }),
    [filters, setFilters],
  );
  const setPeriod = useCallback(
    (v: number) => setFilters({ ...filters, period: v }),
    [filters, setFilters],
  );
  const setKronologiSource = useCallback(
    (v: string) => setFilters({ ...filters, kron_source: v }),
    [filters, setFilters],
  );
  const setKronologiDirection = useCallback(
    (v: string) => setFilters({ ...filters, kron_direction: v }),
    [filters, setFilters],
  );
  const setKronologiDates = useCallback(
    (from: string, to: string) =>
      setFilters({ ...filters, date_from: from, date_to: to }),
    [filters, setFilters],
  );
  const setPage = list.setPage;
  const setPerPage = list.setPerPage;

  const baseFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      location_id: locationId || undefined,
      category_id: categoryId || undefined,
    }),
    [debouncedSearch, locationId, categoryId],
  );

  const listParams = useMemo(
    () => ({ ...baseFilters, page, per_page: perPage }),
    [baseFilters, page, perPage],
  );

  const analyticsParams = useMemo(() => {
    const base = { ...baseFilters, page, per_page: perPage };
    if (tab === "perkiraan-habis")
      return { ...base, window: 30, threshold: period };
    return { ...base, days: period };
  }, [baseFilters, page, perPage, tab, period]);

  const syncParams = useMemo(
    () => ({ search: debouncedSearch || undefined, page, per_page: perPage }),
    [debouncedSearch, page, perPage],
  );

  const kronologiParams = useMemo(
    () => ({
      view: kronologiView,
      search: debouncedSearch || undefined,
      location_id: locationId || undefined,
      source: kronologiSource || undefined,
      direction:
        kronologiDirection === "in" || kronologiDirection === "out"
          ? (kronologiDirection as "in" | "out")
          : undefined,
      date_from: kronologiDateFrom || undefined,
      date_to: kronologiDateTo || undefined,
      page,
      per_page: perPage,
    }),
    [
      kronologiView,
      debouncedSearch,
      locationId,
      kronologiSource,
      kronologiDirection,
      kronologiDateFrom,
      kronologiDateTo,
      page,
      perPage,
    ],
  );

  const listQuery = useMonitorList(tab, subMode, listParams);
  const analyticsQuery = useMonitorAnalytics(tab, analyticsParams);
  const failedSyncQuery = useFailedSync(tab, syncParams);
  const kronologiQuery = useKronologi(tab, kronologiParams);
  const { data: movementFilters } = useMovementFilters(isKronologiTab(tab));
  const summaryQuery = useMonitorSummary(baseFilters, subMode);
  const summary = summaryQuery.data;
  const { data: locData } = useLocations({ perPage: 100 });
  const { data: categoryTree } = useEnabledCategories();
  const queueMutation = useQueueFromMonitor();

  const active = isKronologiTab(tab)
    ? kronologiQuery
    : isSyncTab(tab)
      ? failedSyncQuery
      : isAnalyticsTab(tab)
        ? analyticsQuery
        : listQuery;
  const activeIsSwitching = active.isPending || active.isPlaceholderData;
  const meta = activeIsSwitching ? EMPTY_META : (active.data?.meta ?? EMPTY_META);

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

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Semua Kategori" },
      ...flattenCategories(categoryTree ?? []),
    ],
    [categoryTree],
  );

  const locationLabel = useMemo(() => {
    if (!locationId) return "Semua Lokasi";
    return (
      (locData?.items ?? []).find((l) => l.id === locationId)?.locationName ??
      "—"
    );
  }, [locationId, locData]);

  const changeTab = useCallback(
    (t: MonitorTab) => {
      setTab(t);
      if (isAnalyticsTab(t)) setPeriod(PERIOD_DEFAULT[t] ?? 30);
      resetPage();
    },
    [setTab, setPeriod, resetPage],
  );

  const changeSub = useCallback(
    (m: OutOfStockMode) => {
      setSubMode(m);
      resetPage();
    },
    [setSubMode, resetPage],
  );

  const onFilter = useCallback(
    (fn: () => void) => {
      fn();
      resetPage();
    },
    [resetPage],
  );

  const hasFilter = Boolean(locationId || categoryId || search);
  const activeCount = [locationId, categoryId, search].filter(Boolean).length;

  const subTotal = (key: OutOfStockMode): number | undefined => {
    if (!summary) return undefined;
    return key === "habis"
      ? summary.habis
      : key === "minus"
        ? summary.minus
        : summary.dipesan;
  };

  const totalBadge = tab === "stok-kosong" ? subTotal(subMode) : meta.total;
  const totalIsLoading =
    tab === "stok-kosong"
      ? summaryQuery.isPending || summaryQuery.isPlaceholderData
      : activeIsSwitching;

  const exportMenu = (
    <MonitorStockExportMenu
      tab={tab}
      subMode={subMode}
      kronologiView={kronologiView}
      search={debouncedSearch}
      locationId={locationId}
      categoryId={categoryId}
      period={period}
      kronologiSource={kronologiSource}
      kronologiDirection={kronologiDirection}
      dateFrom={kronologiDateFrom}
      dateTo={kronologiDateTo}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={tab}
        onValueChange={(val) => changeTab(val as MonitorTab)}
        className="flex flex-col gap-4"
      >
        <TabsList variant="glass" className="max-w-full overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="text-muted-foreground data-active:bg-background data-active:font-medium data-active:text-primary data-active:shadow-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
          {tab === "stok-kosong" ? (
            <Tabs
              value={subMode}
              onValueChange={(v) => changeSub(v as OutOfStockMode)}
            >
              <TabsList variant="line" className="h-auto">
                {SUB_TABS.map(({ key, label }) => (
                  <TabsTrigger key={key} value={key}>
                    {label}
                    {subTotal(key) !== undefined && (
                      <span className="ml-0.5 rounded-full bg-muted px-1.5 text-2xs tabular-nums">
                        {subTotal(key)}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : isAnalyticsTab(tab) ? (
            <div className="w-52">
              <Combobox
                options={PERIOD_OPTIONS[tab] ?? []}
                value={String(period)}
                onChange={(v) =>
                  onFilter(() => setPeriod(Number(v) || PERIOD_DEFAULT[tab]))
                }
                placeholder="Periode"
                searchPlaceholder="Pilih periode"
                className="h-9 bg-background"
              />
            </div>
          ) : isKronologiTab(tab) ? (
            <Tabs
              value={kronologiView}
              onValueChange={(v) =>
                onFilter(() => setKronologiView(v as KronologiView))
              }
            >
              <TabsList variant="line" className="h-auto">
                {KRONOLOGI_VIEWS.map(({ key, label }) => (
                  <TabsTrigger key={key} value={key}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Total{" "}
            <Badge variant="secondary" className="tabular-nums">
              {totalIsLoading ? (
                <Loader2Icon className="size-3.5 animate-spin" aria-label="Memuat total" />
              ) : (
                (totalBadge ?? 0)
              )}
            </Badge>
          </div>
        </div>

        {isSyncTab(tab) ? (
          <>
            <FilterToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari produk (SKU / nama)..."
              align="end"
              hasFilter={false}
              activeCount={0}
              gridCols={3}
              trailing={exportMenu}
            >
              <div />
              <div />
              <div />
            </FilterToolbar>

            <div className="px-4 py-3 sm:px-5">
              <MonitorSyncFailedTable
                rows={activeIsSwitching ? [] : (failedSyncQuery.data?.items ?? [])}
                meta={meta}
                isLoading={activeIsSwitching}
                isFetching={failedSyncQuery.isFetching}
                onPageChange={setPage}
                onPerPageChange={(s) => {
                  setPerPage(s);
                  resetPage();
                }}
              />
            </div>
          </>
        ) : isKronologiTab(tab) ? (
          <>
            <FilterToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari produk (SKU / nama)..."
              align="end"
              hasFilter={false}
              activeCount={0}
              trailing={exportMenu}
            />

            <div className="flex flex-wrap items-end gap-3 px-4 pt-3 sm:px-5">
              <div className="min-w-[220px] flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Rentang Tanggal
                </label>
                <DateRangePicker
                  value={{
                    from: kronologiDateFrom
                      ? new Date(kronologiDateFrom)
                      : undefined,
                    to: kronologiDateTo ? new Date(kronologiDateTo) : undefined,
                  }}
                  onChange={(range) => {
                    const toStr = (d?: Date) =>
                      d ? d.toISOString().slice(0, 10) : "";
                    setKronologiDates(toStr(range?.from), toStr(range?.to));
                  }}
                  placeholder="Pilih rentang tanggal"
                  className="h-9 bg-background"
                />
              </div>
              <div className="w-48">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Lokasi
                </label>
                <Combobox
                  options={[
                    { value: "", label: "Semua Lokasi" },
                    ...((movementFilters?.locations ?? []) as {
                      value: string;
                      label: string;
                    }[]),
                  ]}
                  value={locationId}
                  onChange={(v) => onFilter(() => setLocationId(v ?? ""))}
                  placeholder="Semua Lokasi"
                  searchPlaceholder="Cari lokasi"
                  className="h-9 bg-background"
                />
              </div>
              <div className="w-48">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Jenis
                </label>
                <Combobox
                  options={[
                    { value: "", label: "Semua Jenis" },
                    ...((movementFilters?.sources ?? []) as {
                      value: string;
                      label: string;
                    }[]),
                  ]}
                  value={kronologiSource}
                  onChange={(v) => onFilter(() => setKronologiSource(v ?? ""))}
                  placeholder="Semua Jenis"
                  searchPlaceholder="Cari jenis"
                  className="h-9 bg-background"
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Arah
                </label>
                <Combobox
                  options={[
                    { value: "", label: "Semua Arah" },
                    ...((movementFilters?.directions ?? []) as {
                      value: string;
                      label: string;
                    }[]),
                  ]}
                  value={kronologiDirection}
                  onChange={(v) =>
                    onFilter(() => setKronologiDirection(v ?? ""))
                  }
                  placeholder="Semua Arah"
                  searchPlaceholder="Pilih arah"
                  className="h-9 bg-background"
                />
              </div>
            </div>

            <div className="px-4 py-3 sm:px-5">
              <MonitorKronologiTable
                rows={activeIsSwitching ? [] : (kronologiQuery.data?.items ?? [])}
                meta={meta}
                isLoading={activeIsSwitching}
                isFetching={kronologiQuery.isFetching}
                onPageChange={setPage}
                onPerPageChange={(s) => {
                  setPerPage(s);
                  resetPage();
                }}
                emptyText={
                  kronologiView === "clean"
                    ? "Belum ada pergerakan bersih pada rentang ini."
                    : kronologiView === "attention"
                      ? "Tidak ada baris yang perlu perhatian."
                      : "Belum ada pergerakan stok."
                }
              />
            </div>
          </>
        ) : (
          <>
            <FilterToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari produk (SKU / nama)..."
              align="end"
              onReset={
                hasFilter
                  ? () =>
                      onFilter(() => {
                        setSearch("");
                        setLocationId("");
                        setCategoryId("");
                      })
                  : undefined
              }
              hasFilter={hasFilter}
              activeCount={activeCount}
              gridCols={2}
              trailing={exportMenu}
            >
              <Combobox
                options={locationOptions}
                value={locationId}
                onChange={(v) => onFilter(() => setLocationId(v ?? ""))}
                placeholder="Lokasi"
                searchPlaceholder="Cari lokasi"
                className="h-9 bg-background"
              />
              <Combobox
                options={categoryOptions}
                value={categoryId}
                onChange={(v) => onFilter(() => setCategoryId(v ?? ""))}
                placeholder="Kategori"
                searchPlaceholder="Cari kategori"
                className="h-9 bg-background"
              />
            </FilterToolbar>

            <div className="px-4 py-3 sm:px-5">
              {isStockTab(tab) ? (
                <MonitorStockTable
                  rows={activeIsSwitching ? [] : (listQuery.data?.items ?? [])}
                  meta={meta}
                  isLoading={activeIsSwitching}
                  isFetching={listQuery.isFetching}
                  locationLabel={locationLabel}
                  showRestock={tab === "menipis"}
                  enableQueueAction={
                    tab === "stok-kosong" && subMode === "dipesan"
                  }
                  isQueueing={queueMutation.isPending}
                  onQueue={(selected, table) => {
                    queueMutation.mutate(
                      { item_ids: selected.map((row) => row.item_id) },
                      { onSuccess: () => table.resetRowSelection() },
                    );
                  }}
                  onQueueRow={(row) => {
                    queueMutation.mutate({ item_ids: [row.item_id] });
                  }}
                  emptyText={
                    tab === "menipis"
                      ? "Tidak ada produk menipis."
                      : tab === "sedang-dibeli"
                        ? "Tidak ada produk yang sedang dibeli."
                        : "Tidak ada produk pada kategori ini."
                  }
                  onPageChange={setPage}
                  onPerPageChange={(s) => {
                    setPerPage(s);
                    resetPage();
                  }}
                />
              ) : (
                <MonitorAnalyticsTable
                  kind={tab as AnalyticsKind}
                  rows={activeIsSwitching ? [] : (analyticsQuery.data?.items ?? [])}
                  meta={meta}
                  isLoading={activeIsSwitching}
                  isFetching={analyticsQuery.isFetching}
                  emptyText={
                    tab === "tidak-laku"
                      ? "Tidak ada produk tidak laku pada periode ini."
                      : tab === "paling-laku"
                        ? "Belum ada penjualan pada periode ini."
                        : "Tidak ada produk yang diperkirakan habis pada periode ini."
                  }
                  onPageChange={setPage}
                  onPerPageChange={(s) => {
                    setPerPage(s);
                    resetPage();
                  }}
                />
              )}
            </div>
          </>
        )}
      </LiquidGlass>
    </div>
  );
}
