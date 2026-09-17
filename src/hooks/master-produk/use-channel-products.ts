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
  ChannelProductService,
  type ChannelListingParams,
} from "@/services/master-produk/channel-product.service";
import { DownloadService } from "@/services/master-produk/download.service";
import { apiError } from "@/lib/toast";

export { channelListingRowId } from "@/services/master-produk/channel-product.service";
export type {
  ChannelListing,
  ChannelListingParams,
  ChannelListingVariant,
} from "@/services/master-produk/channel-product.service";

export const channelProductsKey = (params: ChannelListingParams) =>
  ["master-produk", "channel-products", params] as const;

export function useChannelProducts(params: ChannelListingParams) {
  return useQuery({
    queryKey: channelProductsKey(params),
    queryFn: () => ChannelProductService.list(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

function useInvalidateChannelProducts() {
  const qc = useQueryClient();
  return React.useCallback(() => {
    qc.invalidateQueries({ queryKey: ["master-produk", "channel-products"] });
  }, [qc]);
}

export interface UnlinkInput {
  channel: string;
  externalProductId: string;
  shopId: string;
}

export function useUnlinkListing() {
  const invalidate = useInvalidateChannelProducts();
  return useMutation({
    mutationFn: ({ channel, externalProductId, shopId }: UnlinkInput) =>
      ChannelProductService.unlink(channel, externalProductId, shopId),
    onSuccess: () => {
      toast.success("Koneksi channel diputus");
      invalidate();
    },
    onError: (err) => apiError(err, "Gagal memutus koneksi"),
  });
}

export function useBulkUnlinkListing() {
  const invalidate = useInvalidateChannelProducts();
  return useMutation({
    mutationFn: async (items: UnlinkInput[]) => {
      return ChannelProductService.bulkUnlink(items);
    },
    onSuccess: (result) => {
      const ok = result?.succeeded ?? 0;
      const failed = result?.failed?.length ?? 0;
      if (ok > 0) toast.success(`${ok} koneksi diputus`);
      if (failed > 0) toast.error(`${failed} koneksi gagal diputus`);
      invalidate();
    },
    onError: (err) => apiError(err, "Gagal memutus koneksi"),
  });
}

export function useDownloadChannel() {
  const invalidate = useInvalidateChannelProducts();
  return useMutation({
    mutationFn: ({ channel, shopId }: { channel: string; shopId: string }) =>
      DownloadService.downloadShop(channel, shopId),
    onSuccess: () => {
      toast.success("Download produk dari channel diantrekan");
      invalidate();
    },
    onError: (err) => apiError(err, "Gagal memulai download"),
  });
}

export function useListingMutations() {
  const invalidate = useInvalidateChannelProducts();

  const activate = useMutation({
    mutationFn: ({ channel, externalProductId, shopId }: UnlinkInput) =>
      ChannelProductService.activate(channel, externalProductId, shopId),
    onSuccess: () => {
      toast.success("Listing diaktifkan");
      invalidate();
    },
    onError: (err) => apiError(err, "Aksi gagal diproses"),
  });

  const deactivate = useMutation({
    mutationFn: ({ channel, externalProductId, shopId }: UnlinkInput) =>
      ChannelProductService.deactivate(channel, externalProductId, shopId),
    onSuccess: () => {
      toast.success("Listing dinonaktifkan");
      invalidate();
    },
    onError: (err) => apiError(err, "Aksi gagal diproses"),
  });

  const sync = useMutation({
    mutationFn: ({ channel, externalProductId, shopId }: UnlinkInput) =>
      ChannelProductService.syncPriceStock(channel, externalProductId, shopId),
    onSuccess: () => {
      toast.success("Sinkron harga & stok diantrekan");
      invalidate();
    },
    onError: (err) => apiError(err, "Aksi gagal diproses"),
  });

  return { activate, deactivate, sync };
}
