"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { InventoryStockService } from "@/services/persediaan/inventory.service";
import type {
  StockListParams,
  StockMovementParams,
} from "@/types/persediaan/stock";
import {
  freshOnViewOptions,
  STALE_DEFAULT,
  STALE_STATIC,
} from "@/lib/query-config";

const STALE = STALE_DEFAULT;

const all = ["inventory"] as const;

export const inventoryKeys = {
  all,
  list: (params: StockListParams) => [...all, "list", params] as const,
  item: (itemId: string) => [...all, "item", itemId] as const,
  movements: (params: StockMovementParams) =>
    [...all, "movements", params] as const,
  itemStock: (itemId: string) => [...all, "item-stock", itemId] as const,
  skuStockAtLocation: (sku: string, locationId: string) =>
    [...all, "sku-stock-at-location", locationId, sku] as const,
  movementFilters: () => [...all, "movement-filters"] as const,
  aggregatedByIds: (ids: string[]) =>
    [...all, "aggregated-by-ids", [...ids].sort()] as const,
};

export function useAggregatedStocksByIds(itemIds: string[]) {
  return useQuery({
    queryKey: inventoryKeys.aggregatedByIds(itemIds),
    queryFn: () => InventoryStockService.aggregatedStocksByIds(itemIds),
    staleTime: STALE,
    enabled: itemIds.length > 0,
  });
}

export function useStockPosition(params: StockListParams) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => InventoryStockService.list(params),
    ...freshOnViewOptions,
  });
}

export function useStockItem(itemId: string) {
  return useQuery({
    queryKey: inventoryKeys.item(itemId),
    queryFn: () => InventoryStockService.getItem(itemId),
    staleTime: STALE,
    enabled: !!itemId,
  });
}

export function useStockMovements(params: StockMovementParams) {
  return useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: () => InventoryStockService.movements(params),
    staleTime: STALE,
    enabled: !!params["filter[item_id]"],
  });
}

export function useItemStock(itemId: string) {
  return useQuery({
    queryKey: inventoryKeys.itemStock(itemId),
    queryFn: () => InventoryStockService.getItemStock(itemId),
    ...freshOnViewOptions,
    enabled: !!itemId,
  });
}

/**
 * Loads the live bin balances for one SKU only when a caller explicitly needs
 * them. This keeps row-based editors from issuing one request per visible row.
 */
export function useSkuStockAtLocation(
  sku: string,
  locationId: string,
  enabled: boolean,
) {
  const normalizedSku = sku.trim();

  return useQuery({
    queryKey: inventoryKeys.skuStockAtLocation(normalizedSku, locationId),
    queryFn: () => InventoryStockService.bySku(normalizedSku, locationId),
    enabled: enabled && !!normalizedSku && !!locationId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useMovementFilters() {
  return useQuery({
    queryKey: inventoryKeys.movementFilters(),
    queryFn: () => InventoryStockService.movementFilters(),
    staleTime: STALE_STATIC,
  });
}

export function usePrefetchStockDetail() {
  const qc = useQueryClient();
  return useCallback(
    (itemId: string) => {
      qc.prefetchQuery({
        queryKey: inventoryKeys.item(itemId),
        queryFn: () => InventoryStockService.getItem(itemId),
        staleTime: STALE,
      });
      qc.prefetchQuery({
        queryKey: inventoryKeys.itemStock(itemId),
        queryFn: () => InventoryStockService.getItemStock(itemId),
        staleTime: STALE,
      });
    },
    [qc],
  );
}
