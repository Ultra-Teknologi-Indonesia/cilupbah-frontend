"use client";

import * as React from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  UploadService,
  type DraftParams,
  type HistoryParams,
  type UploadListingParams,
  type BulkUploadResult,
} from "@/services/master-produk/upload.service";
import { apiError } from "@/lib/toast";

export type {
  CategoryRules,
  DraftRow,
  DraftStatus,
  HistoryRow,
  MatchRow,
  RulesSummary,
  UploadDestination,
} from "@/services/master-produk/upload.service";

export const uploadListingKey = (
  productId: string,
  params: UploadListingParams,
) => ["master-produk", "upload-listing", productId, params] as const;
export const channelDraftsKey = (params: DraftParams) =>
  ["master-produk", "channel-drafts", params] as const;
export const uploadHistoriesKey = (params: HistoryParams) =>
  ["master-produk", "upload-histories", params] as const;

export function useUploadListing(
  productId: string,
  params: UploadListingParams,
) {
  return useQuery({
    queryKey: uploadListingKey(productId, params),
    queryFn: () => UploadService.listing(productId, params),
    enabled: !!productId,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useMatchListing(productId: string) {
  return useMutation({
    mutationFn: (storeIds: string[]) =>
      UploadService.match(productId, storeIds),
    onError: (err) => apiError(err, "Gagal mencocokkan data master"),
  });
}

function useInvalidateUpload(productId?: string) {
  const qc = useQueryClient();
  return React.useCallback(() => {
    qc.invalidateQueries({ queryKey: ["master-produk", "upload-listing"] });
    qc.invalidateQueries({ queryKey: ["master-produk", "channel-drafts"] });
    qc.invalidateQueries({ queryKey: ["master-produk", "upload-histories"] });
    if (productId) {
      qc.invalidateQueries({
        queryKey: ["master-produk", "detail", productId],
      });
    }
  }, [qc, productId]);
}

export function useUploadToStores(productId: string) {
  const invalidate = useInvalidateUpload(productId);

  return useMutation({
    mutationFn: (shopIds: string[]) =>
      UploadService.uploadToStores(productId, shopIds),
    onSuccess: (res) => {
      if (res.uploaded > 0)
        toast.success(`${res.uploaded} toko diantrekan untuk upload`);
      if (res.skipped.length > 0) {
        toast.warning(`${res.skipped.length} toko dilewati`, {
          description: res.skipped
            .map((s) => s.reason)
            .slice(0, 3)
            .join("; "),
        });
      }
      if (res.uploaded === 0 && res.skipped.length === 0) {
        toast("Tidak ada toko yang diantrekan");
      }
      invalidate();
    },
    onError: (err) => apiError(err, "Upload gagal diproses"),
  });
}

export const requiredAttributesKey = (productId: string, shopId: string) =>
  ["master-produk", "required-attributes", productId, shopId] as const;

export function useRequiredAttributes(
  productId: string,
  shopId: string | null,
) {
  return useQuery({
    queryKey: requiredAttributesKey(productId, shopId ?? ""),
    queryFn: () => UploadService.fetchRequiredAttributes(productId, shopId!),
    enabled: !!productId && !!shopId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useUploadWithAttributes(productId: string) {
  const invalidate = useInvalidateUpload(productId);

  return useMutation({
    mutationFn: ({
      shopIds,
      attributeMapping,
    }: {
      shopIds: string[];
      attributeMapping: Record<string, string> | null;
    }) =>
      UploadService.uploadToStoresWithAttributes(
        productId,
        shopIds,
        attributeMapping,
      ),
    onSuccess: (res: BulkUploadResult) => {
      if (res.uploaded > 0)
        toast.success(`${res.uploaded} toko diantrekan untuk upload`);
      if (res.skipped.length > 0) {
        toast.warning(`${res.skipped.length} toko dilewati`, {
          description: res.skipped
            .map((s) => s.reason)
            .slice(0, 3)
            .join("; "),
        });
      }
      if (res.uploaded === 0 && res.skipped.length === 0) {
        toast("Tidak ada toko yang diantrekan");
      }
      invalidate();
    },
    onError: (err) => apiError(err, "Upload gagal diproses"),
  });
}

export function useChannelDrafts(params: DraftParams) {
  return useQuery({
    queryKey: channelDraftsKey(params),
    queryFn: () => UploadService.drafts(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useUploadDraft() {
  const invalidate = useInvalidateUpload();
  return useMutation({
    mutationFn: (draftId: string) => UploadService.uploadDraft(draftId),
    onSuccess: () => {
      toast.success("Draft diantrekan untuk upload");
      invalidate();
    },
    onError: (err) => apiError(err, "Gagal mengupload draft"),
  });
}

export function useDeleteDraft() {
  const invalidate = useInvalidateUpload();
  return useMutation({
    mutationFn: ({
      productId,
      draftId,
    }: {
      productId: string;
      draftId: string;
    }) => UploadService.deleteDraft(productId, draftId),
    onSuccess: () => {
      toast.success("Draft dihapus");
      invalidate();
    },
    onError: (err) => apiError(err, "Gagal menghapus draft"),
  });
}

export function useUploadHistories(params: HistoryParams) {
  return useQuery({
    queryKey: uploadHistoriesKey(params),
    queryFn: () => UploadService.histories(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useReuploadHistory() {
  const invalidate = useInvalidateUpload();
  return useMutation({
    mutationFn: (id: string) => UploadService.reupload(id),
    onSuccess: () => {
      toast.success("Produk diantrekan untuk upload ulang");
      invalidate();
    },
    onError: (err) => apiError(err, "Gagal mengantrekan upload ulang"),
  });
}

export function useBulkDeleteHistories() {
  const invalidate = useInvalidateUpload();
  return useMutation({
    mutationFn: (ids: string[]) => UploadService.bulkDeleteHistories(ids),
    onSuccess: () => {
      toast.success("Riwayat upload dihapus");
      invalidate();
    },
    onError: (err) => apiError(err, "Gagal menghapus riwayat"),
  });
}
