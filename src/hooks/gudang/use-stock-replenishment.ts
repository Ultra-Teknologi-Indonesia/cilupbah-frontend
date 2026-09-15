"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import { StockReplenishmentService } from "@/services/gudang/stock-replenishment.service";
import type {
  AcceptReplenishmentPayload,
  StockReplenishmentListParams,
  UpdateReplenishmentItemPayload,
  QueueFromMonitorPayload,
  StockReplenishmentItemsParams,
} from "@/types/gudang/stock-replenishment";

const KEYS = {
  all: ["stock-replenishment"] as const,
  list: (params: StockReplenishmentListParams) =>
    [...KEYS.all, "list", params] as const,
  detail: (id: string) => [...KEYS.all, "detail", id] as const,
  items: (id: string, params?: StockReplenishmentItemsParams) =>
    [...KEYS.all, "items", id, params] as const,
  itemFilters: (id: string) => [...KEYS.all, "item-filters", id] as const,
  pendingCount: () => [...KEYS.all, "pending-count"] as const,
};

export function useStockReplenishments(
  params: StockReplenishmentListParams = {},
) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => StockReplenishmentService.list(params),
  });
}

export function useStockReplenishmentDetail(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => StockReplenishmentService.detail(id),
    enabled: !!id,
  });
}

export function useStockReplenishmentItems(
  id: string,
  params: StockReplenishmentItemsParams = {},
) {
  return useQuery({
    queryKey: KEYS.items(id, params),
    queryFn: () => StockReplenishmentService.items(id, params),
    enabled: !!id,
    placeholderData: (previous) => previous,
  });
}

export function useStockReplenishmentItemFilters(id: string) {
  return useQuery({
    queryKey: KEYS.itemFilters(id),
    queryFn: () => StockReplenishmentService.itemFilters(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function usePendingReplenishmentCount() {
  return useQuery({
    queryKey: KEYS.pendingCount(),
    queryFn: () => StockReplenishmentService.pendingCount(),
    refetchInterval: 60_000,
  });
}

export function useQueueFromMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QueueFromMonitorPayload) =>
      StockReplenishmentService.queueFromMonitor(payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["monitor-stok"] });
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Produk masuk ke permintaan restock", {
        description: result.skipped_item_ids.length
          ? `${result.queued_item_ids.length} produk ditambahkan; ${result.skipped_item_ids.length} sudah tidak perlu direstock.`
          : undefined,
      });
    },
    onError: (err) => apiError(err, "Gagal membuat permintaan restock."),
  });
}

export function useAcceptReplenishment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AcceptReplenishmentPayload;
    }) => StockReplenishmentService.accept(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Permintaan pengisian stok disetujui");
    },
    onError: (err) => {
      apiError(err, "Gagal menyetujui permintaan.");
    },
  });
}

export function useRejectReplenishment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      StockReplenishmentService.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ["monitor-stok"] });
      qc.invalidateQueries({ queryKey: KEYS.pendingCount() });
      toast.success("Permintaan ditolak", {
        description:
          "SKU kembali tersedia di Monitor Stok untuk diajukan ulang.",
      });
    },
    onError: (err) => {
      apiError(err, "Gagal menolak permintaan.");
    },
  });
}

function useItemMutation<TVars extends { id: string }>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  successMessage: string,
  fallbackError: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
      qc.invalidateQueries({ queryKey: [...KEYS.all, "items", vars.id] });
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ["monitor-stok"] });
      toast.success(successMessage);
    },
    onError: (err) => {
      apiError(err, fallbackError);
    },
  });
}

export function useUpdateReplenishmentItem() {
  return useItemMutation(
    ({
      id,
      itemId,
      payload,
    }: {
      id: string;
      itemId: string;
      payload: UpdateReplenishmentItemPayload;
    }) => StockReplenishmentService.updateItem(id, itemId, payload),
    "Item diperbarui",
    "Gagal memperbarui item.",
  );
}

export function useRemoveReplenishmentItem() {
  return useItemMutation(
    ({ id, itemId }: { id: string; itemId: string }) =>
      StockReplenishmentService.removeItem(id, itemId),
    "Item dihapus dan kembali ke Monitor Stok",
    "Gagal menghapus item.",
  );
}
