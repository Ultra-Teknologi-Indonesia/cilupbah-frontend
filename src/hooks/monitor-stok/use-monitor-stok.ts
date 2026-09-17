"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MonitorStockService } from "@/services/monitor-stok/monitor-stok.service";
import type {
  MonitorListParams,
  MonitorAnalyticsParams,
  FailedSyncParams,
  MonitorStockRow,
  MonitorAnalyticsRow,
  MonitorSyncFailedRow,
  MonitorTab,
  OutOfStockMode,
  KronologiParams,
  KronologiRow,
} from "@/types/monitor-stok/monitor";
import { liveQueryOptions, STALE_STATIC } from "@/lib/query-config";

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 20, total: 0 };
const EMPTY_STOCK = { items: [] as MonitorStockRow[], meta: EMPTY_META };
const EMPTY_ANALYTICS = {
  items: [] as MonitorAnalyticsRow[],
  meta: EMPTY_META,
};

const STOCK_TABS: MonitorTab[] = ["stok-kosong", "menipis", "sedang-dibeli"];

const ANALYTICS_TABS: MonitorTab[] = [
  "tidak-laku",
  "paling-laku",
  "perkiraan-habis",
];

export function isStockTab(tab: MonitorTab): boolean {
  return STOCK_TABS.includes(tab);
}

export function isAnalyticsTab(tab: MonitorTab): boolean {
  return ANALYTICS_TABS.includes(tab);
}

export function isSyncTab(tab: MonitorTab): boolean {
  return tab === "gagal-sync";
}

export function isKronologiTab(tab: MonitorTab): boolean {
  return tab === "kronologi";
}

export function isLiveTab(tab: MonitorTab): boolean {
  return (
    isStockTab(tab) ||
    isAnalyticsTab(tab) ||
    isSyncTab(tab) ||
    isKronologiTab(tab)
  );
}

export function useMonitorList(
  tab: MonitorTab,
  mode: OutOfStockMode,
  params: MonitorListParams,
) {
  return useQuery({
    queryKey: [
      "monitor-stok",
      tab,
      tab === "stok-kosong" ? mode : null,
      params,
    ],
    queryFn: () => {
      switch (tab) {
        case "stok-kosong":
          return MonitorStockService.outOfStock(mode, params);
        case "menipis":
          return MonitorStockService.lowStock(params);
        case "sedang-dibeli":
          return MonitorStockService.onOrder(params);
        default:
          return Promise.resolve(EMPTY_STOCK);
      }
    },
    enabled: isStockTab(tab),
    ...liveQueryOptions,
  });
}

export function useMonitorAnalytics(
  tab: MonitorTab,
  params: MonitorAnalyticsParams,
) {
  return useQuery({
    queryKey: ["monitor-stok", "analytics", tab, params],
    queryFn: () => {
      switch (tab) {
        case "tidak-laku":
          return MonitorStockService.deadStock(params);
        case "paling-laku":
          return MonitorStockService.fastMoving(params);
        case "perkiraan-habis":
          return MonitorStockService.estimatedStockOut(params);
        default:
          return Promise.resolve(EMPTY_ANALYTICS);
      }
    },
    enabled: isAnalyticsTab(tab),
    ...liveQueryOptions,
  });
}

export function useMonitorSummary(
  params: MonitorListParams,
  mode?: OutOfStockMode,
) {
  return useQuery({
    queryKey: ["monitor-stok", "summary", params, mode],
    queryFn: () => MonitorStockService.summary(params, mode),
    ...liveQueryOptions,
  });
}

const _EMPTY_SYNC = { items: [] as MonitorSyncFailedRow[], meta: EMPTY_META };

export function useFailedSync(tab: MonitorTab, params: FailedSyncParams) {
  return useQuery({
    queryKey: ["monitor-stok", "failed-sync", params],
    queryFn: () => MonitorStockService.failedSync(params),
    enabled: isSyncTab(tab),
    ...liveQueryOptions,
  });
}

export function useRetrySync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => MonitorStockService.retrySync(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["monitor-stok", "failed-sync"] }),
  });
}

export function useRetryBulkSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => MonitorStockService.retryBulkSync(ids),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["monitor-stok", "failed-sync"] }),
  });
}

const EMPTY_KRONOLOGI = { items: [] as KronologiRow[], meta: EMPTY_META };

export function useKronologi(tab: MonitorTab, params: KronologiParams) {
  return useQuery({
    queryKey: ["monitor-stok", "kronologi", params],
    queryFn: () =>
      isKronologiTab(tab)
        ? MonitorStockService.kronologi(params)
        : Promise.resolve(EMPTY_KRONOLOGI),
    enabled: isKronologiTab(tab),
    ...liveQueryOptions,
  });
}

export function useMovementFilters(enabled: boolean) {
  return useQuery({
    queryKey: ["monitor-stok", "movement-filters"],
    queryFn: () => MonitorStockService.movementFilters(),
    enabled,
    staleTime: STALE_STATIC,
  });
}
