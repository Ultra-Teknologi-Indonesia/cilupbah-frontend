"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  DownloadService,
  type DownloadTransactionParams,
  type DownloadTransactionDetailParams,
} from "@/services/master-produk/download.service";
import { apiError } from "@/lib/toast";

export { channelSearchRowId } from "@/services/master-produk/download.service";
export type {
  ChannelSearchItem,
  ChannelSearchPage,
  DownloadState,
  DownloadTransaction,
  DownloadFailures,
  DownloadFailureReason,
  DownloadFailureSample,
  ChannelDownloadAction,
} from "@/services/master-produk/download.service";

export const downloadTrxKey = (params: DownloadTransactionParams) =>
  ["master-produk", "download-transactions", params] as const;

export const downloadTrxDetailKey = (
  id: string,
  params: DownloadTransactionDetailParams,
) => ["master-produk", "download-transaction", id, params] as const;

export function useDownloadTransactions(params: DownloadTransactionParams) {
  return useQuery({
    queryKey: downloadTrxKey(params),
    queryFn: () => DownloadService.listTransactions(params),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
}

export function useDownloadTransactionDetail(
  id: string | null,
  params: DownloadTransactionDetailParams,
) {
  return useQuery({
    queryKey: downloadTrxDetailKey(id ?? "", params),
    queryFn: () => DownloadService.getTransaction(id as string, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
}

export const downloadFailuresKey = (id: string) =>
  ["master-produk", "download-transaction", id, "failures"] as const;

export function useDownloadFailures(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: downloadFailuresKey(id ?? ""),
    queryFn: () => DownloadService.getFailures(id as string),
    enabled: !!id && enabled,
    staleTime: 30 * 1000,
  });
}

export function useInvalidateDownloads() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({
      queryKey: ["master-produk", "download-transactions"],
    });
    qc.invalidateQueries({
      queryKey: ["master-produk", "download-transaction"],
    });
  };
}

export function useStartDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stores: { channel: string; shopId: string }[]) => {
      const byChannel = new Map<string, string[]>();
      for (const s of stores) {
        if (!s.channel || !s.shopId) continue;
        byChannel.set(s.channel, [
          ...(byChannel.get(s.channel) ?? []),
          s.shopId,
        ]);
      }
      const entries = Array.from(byChannel);
      const results = await Promise.allSettled(
        entries.map(([channel, shopIds]) =>
          shopIds.length === 1
            ? DownloadService.downloadShop(channel, shopIds[0])
            : DownloadService.downloadShopBulk(channel, shopIds),
        ),
      );

      const succeeded: { channel: string; count: number }[] = [];
      const failed: { channel: string; count: number }[] = [];
      results.forEach((r, i) => {
        const [channel, shopIds] = entries[i];
        (r.status === "fulfilled" ? succeeded : failed).push({
          channel,
          count: shopIds.length,
        });
      });

      if (succeeded.length === 0) {
        const rejected = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );
        throw rejected?.reason ?? new Error("Semua download gagal diantrekan");
      }

      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      const okCount = succeeded.reduce((sum, s) => sum + s.count, 0);
      toast.success(`Download ${okCount} toko diantrekan`, {
        description: "Pantau progresnya di tab Progress.",
      });
      if (failed.length > 0) {
        const failCount = failed.reduce((sum, f) => sum + f.count, 0);
        toast.warning(`${failCount} toko gagal diantrekan`, {
          description: `Channel gagal: ${failed.map((f) => f.channel).join(", ")}`,
        });
      }
      qc.invalidateQueries({
        queryKey: ["master-produk", "download-transactions"],
      });
    },
    onError: (err) => apiError(err, "Gagal memulai download"),
  });
}

export function useChannelSearchPage() {
  return useMutation({
    mutationFn: (params: {
      channel: string;
      shopId: string;
      q: string;
      offset: number;
      limit: number;
    }) => DownloadService.searchChannel(params),
    onError: (err) => apiError(err, "Gagal mencari produk"),
  });
}

export function useUnifiedChannelSearch() {
  return useMutation({
    mutationFn: (params: {
      q: string;
      shopIds?: string[];
      limitPerShop?: number;
    }) => DownloadService.searchUnified(params),
    onError: (err) => apiError(err, "Gagal mencari produk lintas channel"),
  });
}

export function useDownloadProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      channel: string;
      shopId: string;
      externalProductId: string;
    }) => DownloadService.downloadProduct(params),
    onSuccess: (transaction) => {
      toast.success("Download produk diantrekan", {
        description: `Pantau progresnya pada transaksi ${transaction.trxNo}.`,
      });
      qc.invalidateQueries({
        queryKey: ["master-produk", "download-transactions"],
      });
      qc.invalidateQueries({ queryKey: ["master-produk"] });
    },
    onError: (err) => apiError(err, "Gagal mengunduh produk"),
  });
}
