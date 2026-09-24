"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  InventorySettingService,
  type InventorySettingListParams,
} from "@/services/persediaan/inventory-setting.service";
import type { ImportSettingType } from "@/types/persediaan/inventory-setting";
import { apiError } from "@/lib/toast";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";

const KEY = "inventory-settings";

export const importSettingTemplateUrl = (type: ImportSettingType) =>
  InventorySettingService.importTemplateUrl(type);

export const downloadImportSettingTemplate = (type: ImportSettingType) =>
  InventorySettingService.downloadTemplate(type);

export function useExportRackAllocation() {
  return useAsyncExport(InventorySettingService.exportRackAllocation, {
    autoDownload: true,
  });
}

export function useInventorySettingProducts(
  params: InventorySettingListParams,
) {
  return useQuery({
    queryKey: [KEY, "products", params] as const,
    queryFn: () => InventorySettingService.listProducts(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useUpdateThresholds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      minStock,
      safeStock,
    }: {
      itemId: string;
      minStock: number;
      safeStock: number;
    }) =>
      InventorySettingService.updateThresholds(itemId, {
        min_stock: minStock,
        safe_stock: safeStock,
      }),
    onSuccess: () => {
      toast.success("Berhasil memperbarui batas stok");
      qc.invalidateQueries({ queryKey: [KEY, "products"] });
    },
    onError: (err) => apiError(err, "Gagal memperbarui batas stok"),
  });
}

export function useImportSettingPreview() {
  return useMutation({
    mutationFn: ({ type, file }: { type: ImportSettingType; file: File }) =>
      InventorySettingService.importPreview(type, file),
    onError: (err) => apiError(err, "Gagal membaca file"),
  });
}

export function useImportSettingConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, token }: { type: ImportSettingType; token: string }) =>
      InventorySettingService.importConfirm(type, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "products"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => apiError(err, "Gagal menerapkan import"),
  });
}
