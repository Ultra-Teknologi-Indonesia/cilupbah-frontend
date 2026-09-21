"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  SyncStockService,
  type SyncStockPayload,
} from "@/services/master-produk/sync-stock.service";
import { apiError } from "@/lib/toast";

export type {
  SyncStockFilters,
  SyncStockMode,
  SyncStockPayload,
} from "@/services/master-produk/sync-stock.service";

export function useSyncStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SyncStockPayload) =>
      SyncStockService.syncStock(payload),
    onSuccess: (res, payload) => {
      if (payload.mode === "all") {
        toast.success("Semua stok berhasil disinkronkan");
      } else {
        const count = res?.data?.queued ?? payload.productIds?.length ?? 0;
        toast.success(`Stok ${count} produk berhasil disinkronkan`);
      }
      qc.invalidateQueries({ queryKey: ["master-produk"] });
    },
    onError: (err) => apiError(err, "Gagal menyinkronkan stok"),
  });
}
