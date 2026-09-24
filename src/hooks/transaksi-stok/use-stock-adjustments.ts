"use client";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import {
  StockAdjustmentService,
  type BulkDeleteResult,
} from "@/services/transaksi-stok/stock-adjustment.service";
import type {
  StockAdjustmentListParams,
  StockAdjustmentFormData,
  StockAdjustmentPatchData,
} from "@/types/transaksi-stok/stock-adjustment";
import {
  createDetailHook,
  createListHook,
  createMutationHook,
  createResourceKeys,
} from "@/hooks/create-crud-hooks";
import { STOCK_VIEW_KEYS } from "@/lib/stock-cache";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";

export const stockAdjustmentKeys = createResourceKeys("stock-adjustment");

export const useStockAdjustments = createListHook(
  stockAdjustmentKeys,
  (params: StockAdjustmentListParams = {}) =>
    StockAdjustmentService.list(params),
);

export const useStockAdjustmentDetail = createDetailHook(
  stockAdjustmentKeys,
  (id: string) => StockAdjustmentService.getById(id),
);

export const useStockAdjustmentItems = (
  id: string,
  params: StockAdjustmentListParams = {},
) => {
  return useQuery({
    queryKey: [...stockAdjustmentKeys.detail(id), "items", params],
    queryFn: () => StockAdjustmentService.getItems(id, params),
    placeholderData: keepPreviousData,
  });
};

export const useCreateStockAdjustment = createMutationHook({
  mutationFn: (data: StockAdjustmentFormData) =>
    StockAdjustmentService.create(data),
  successMessage: "Koreksi stok berhasil dibuat",
  errorMessage: "Gagal membuat koreksi stok",
  silentError: true,
  invalidates: () => [stockAdjustmentKeys.lists, ...STOCK_VIEW_KEYS],
});

export const useUpdateStockAdjustment = createMutationHook({
  mutationFn: ({ id, data }: { id: string; data: StockAdjustmentFormData }) =>
    StockAdjustmentService.update(id, data),
  successMessage: "Koreksi stok berhasil diperbarui",
  errorMessage: "Gagal memperbarui koreksi stok",
  invalidates: ({ id }) => [
    stockAdjustmentKeys.lists,
    stockAdjustmentKeys.detail(id),
    [...stockAdjustmentKeys.detail(id), "items"],
    ...STOCK_VIEW_KEYS,
  ],
});

export const usePatchStockAdjustment = createMutationHook({
  mutationFn: ({ id, data }: { id: string; data: StockAdjustmentPatchData }) =>
    StockAdjustmentService.patch(id, data),
  successMessage: "Koreksi stok berhasil diperbarui",
  errorMessage: "Gagal memperbarui koreksi stok",
  // The form keeps a detailed, dismissible banner visible until the operator
  // has read and resolved the failed stock validation.
  silentError: true,
  invalidates: ({ id }) => [
    stockAdjustmentKeys.lists,
    stockAdjustmentKeys.detail(id),
    [...stockAdjustmentKeys.detail(id), "items"],
    ...STOCK_VIEW_KEYS,
  ],
});

export const useDeleteStockAdjustment = createMutationHook({
  mutationFn: (id: string) => StockAdjustmentService.delete(id),
  successMessage: "Koreksi stok berhasil dihapus",
  errorMessage: "Gagal menghapus koreksi stok",
  invalidates: () => [stockAdjustmentKeys.lists, ...STOCK_VIEW_KEYS],
});

export function useExportStockAdjustments() {
  return useAsyncExport(StockAdjustmentService.exportXlsx, {
    autoDownload: true,
  });
}

export function useStockAdjustmentBulkPdfAsync() {
  return useMutation({
    mutationFn: (ids: string[]) => StockAdjustmentService.bulkPdfAsync(ids),
  });
}

export const useBulkDeleteStockAdjustment = createMutationHook<
  string[],
  BulkDeleteResult
>({
  mutationFn: (ids: string[]) => StockAdjustmentService.bulkDelete(ids),
  successMessage: (data) =>
    data.failed.length > 0
      ? `${data.deleted} dokumen dihapus, ${data.failed.length} gagal`
      : `${data.deleted} dokumen berhasil dihapus`,
  errorMessage: "Gagal menghapus koreksi stok",
  invalidates: () => [stockAdjustmentKeys.lists, ...STOCK_VIEW_KEYS],
});
