"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import {
  InventorySyncService,
  type SyncBulkToggleInput,
  type SyncMatrixParams,
  type SyncMatrixResult,
  type SyncToggleItem,
} from "@/services/persediaan/inventory-sync.service";

export type {
  StockPushStatus,
  StockSyncHistoryItem,
  StockSyncState,
  InternalStock,
} from "@/services/persediaan/inventory-sync.service";

export type {
  SyncMatrixParams,
  SyncMatrixRow,
  SyncStoreCell,
  SyncStoreColumn,
} from "@/services/persediaan/inventory-sync.service";

const all = ["inventory-sync"] as const;

export const inventorySyncKeys = {
  all,
  list: (params: SyncMatrixParams) => [...all, "list", params] as const,
  history: (mappingId: string) => [...all, "history", mappingId] as const,
};

export function useInventorySync(params: SyncMatrixParams) {
  return useQuery({
    queryKey: inventorySyncKeys.list(params),
    queryFn: () => InventorySyncService.list(params),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useToggleSync(params: SyncMatrixParams) {
  const qc = useQueryClient();
  const key = inventorySyncKeys.list(params);

  return useMutation({
    mutationFn: (item: SyncToggleItem) => InventorySyncService.toggle([item]),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<SyncMatrixResult>(key);
      qc.setQueryData<SyncMatrixResult>(key, (old) =>
        old
          ? {
              ...old,
              rows: old.rows.map((row) =>
                row.itemId === item.variantId
                  ? {
                      ...row,
                      stores: row.stores.map((cell) =>
                        cell.channelShopId === item.channelShopId
                          ? { ...cell, syncEnabled: item.syncEnabled }
                          : cell,
                      ),
                    }
                  : row,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (err, _item, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      apiError(err, "Gagal memperbarui sync stok & harga");
    },
    onSuccess: () => toast.success("Berhasil memperbarui sync stok & harga"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: inventorySyncKeys.all });
    },
  });
}

export function useBulkToggleSync() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: SyncBulkToggleInput) =>
      InventorySyncService.bulkToggle(input),
    onSuccess: (affected) =>
      toast.success(`Berhasil memperbarui ${affected} listing`),
    onError: (err) => apiError(err, "Gagal memperbarui sync secara massal"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: inventorySyncKeys.all });
    },
  });
}

export function useRetryStockSync() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (mappingId: string) => InventorySyncService.retry(mappingId),
    onSuccess: (_result, mappingId) => {
      toast.success("Sinkronisasi stok diantrekan");
      qc.invalidateQueries({ queryKey: inventorySyncKeys.all });
      qc.invalidateQueries({ queryKey: inventorySyncKeys.history(mappingId) });
    },
    onError: (err) => apiError(err, "Gagal mengantrekan sinkronisasi stok"),
  });
}

export function useStockSyncHistory(mappingId: string | null) {
  return useQuery({
    queryKey: mappingId
      ? inventorySyncKeys.history(mappingId)
      : [...inventorySyncKeys.all, "history", "empty"],
    queryFn: () => InventorySyncService.history(mappingId as string),
    enabled: !!mappingId,
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
  });
}
